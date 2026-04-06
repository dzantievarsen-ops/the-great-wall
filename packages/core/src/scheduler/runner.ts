#!/usr/bin/env tsx

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { nanoid } from 'nanoid';

import { getDb } from '../storage/db.js';
import {
  insertSource,
  insertItem,
  getUnanalyzedItems,
  updateItemAnalysis,
  getItemsForDigest,
  insertRun,
  completeRun,
  searchItems,
} from '../storage/queries.js';
import { runAgent, loadAgentsConfig } from '../agents/runner.js';
import { detectInstalledAgents } from '../agents/detector.js';
import { scrapeYouTube } from '../scrapers/youtube.js';
import { scrapeSubstack } from '../scrapers/substack.js';
import { scrapeWeb } from '../scrapers/web.js';
import { runWatchman } from '../watchman/agent.js';
import { generateDigest } from '../reports/digest.js';
import { generateComprehensiveReport } from '../reports/comprehensive.js';
import { generateEmergencyAlert } from '../reports/emergency.js';
import { sendEmailReport } from '../reports/email.js';
import { writeDigest, writeReport, writeEmergency, writeMemoryUpdates } from '../voyager/bridge.js';
import type { SourcesConfig } from '../scrapers/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..', '..', '..', '..');

function loadSourcesConfig(): SourcesConfig {
  const path = resolve(__dirname, '..', 'config', 'sources.yaml');
  return parseYaml(readFileSync(path, 'utf-8'));
}

function loadProjectsConfig(): Array<{ name: string; keywords: string[]; stack: string[] }> {
  const path = resolve(__dirname, '..', 'config', 'projects.yaml');
  const raw = parseYaml(readFileSync(path, 'utf-8'));
  return Object.entries(raw.projects).map(([name, p]: [string, any]) => ({
    name,
    keywords: p.keywords ?? [],
    stack: p.stack ?? [],
  }));
}

interface RunOptions {
  dryRun: boolean;
  reportOnly: string | null;
}

function parseArgs(): RunOptions {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    reportOnly: args.includes('--report-only') ? args[args.indexOf('--report-only') + 1] ?? null : null,
  };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const startTime = Date.now();

  console.log('');
  console.log('='.repeat(60));
  console.log('  THE GREAT WALL — AI Intelligence Perimeter');
  console.log('='.repeat(60));
  console.log(`  ${new Date().toISOString()}`);
  console.log(`  Mode: ${options.dryRun ? 'DRY RUN' : options.reportOnly ? `REPORT ONLY (${options.reportOnly})` : 'FULL PIPELINE'}`);
  console.log('='.repeat(60));
  console.log('');

  // Initialize
  const db = getDb(resolve(PROJECT_ROOT, 'data', 'greatwall.db'));
  const agentsConfig = loadAgentsConfig();
  const sourcesConfig = loadSourcesConfig();
  const projectsConfig = loadProjectsConfig();

  // Detect installed agents
  const installed = detectInstalledAgents();
  console.log('[Setup] Installed agents:', Object.entries(installed).filter(([, v]) => v).map(([k]) => k).join(', '));

  // Create run record
  const run = insertRun(db);
  const runId = run.id;

  let itemsScraped = 0;
  let itemsAnalyzed = 0;
  let errors: string[] = [];

  try {
    // If report-only mode, skip scraping and analysis
    if (!options.reportOnly) {
      // ==================== PHASE 1: SCRAPE ====================
      console.log('\n[Phase 1] Scraping sources...\n');

      // Sync sources to DB
      const allSources = [
        ...sourcesConfig.sources.youtube.map((s) => ({ ...s, type: 'youtube' as const, id: `yt_${s.handle}` })),
        ...sourcesConfig.sources.substack.map((s) => ({ ...s, type: 'substack' as const, id: `ss_${s.name.toLowerCase().replace(/\s/g, '_')}` })),
        ...sourcesConfig.sources.web.map((s) => ({ ...s, type: 'web' as const, id: `web_${s.name.toLowerCase().replace(/\s/g, '_')}` })),
      ];

      for (const source of allSources) {
        insertSource(db, {
          id: source.id,
          type: source.type,
          name: source.name,
          url: source.url ?? `https://youtube.com/${source.handle}`,
          handle: source.handle ?? null,
          priority: source.priority as 'critical' | 'high' | 'medium' | 'low',
          category: source.category,
          active: source.active,
        });
      }

      // Scrape each source type
      const allItems = [];

      try {
        console.log('[Scrape] YouTube channels...');
        const ytItems = await scrapeYouTube(sourcesConfig.sources.youtube, runAgent, agentsConfig);
        allItems.push(...ytItems);
        console.log(`[Scrape] YouTube: ${ytItems.length} items`);
      } catch (err: any) {
        console.error('[Scrape] YouTube failed:', err.message);
        errors.push(`YouTube scraping: ${err.message}`);
      }

      try {
        console.log('[Scrape] Substacks...');
        const ssItems = await scrapeSubstack(sourcesConfig.sources.substack, runAgent, agentsConfig);
        allItems.push(...ssItems);
        console.log(`[Scrape] Substack: ${ssItems.length} items`);
      } catch (err: any) {
        console.error('[Scrape] Substack failed:', err.message);
        errors.push(`Substack scraping: ${err.message}`);
      }

      try {
        console.log('[Scrape] Web sources...');
        const webItems = await scrapeWeb(sourcesConfig.sources.web, runAgent, agentsConfig);
        allItems.push(...webItems);
        console.log(`[Scrape] Web: ${webItems.length} items`);
      } catch (err: any) {
        console.error('[Scrape] Web failed:', err.message);
        errors.push(`Web scraping: ${err.message}`);
      }

      itemsScraped = allItems.length;
      console.log(`\n[Phase 1] Total scraped: ${itemsScraped} items\n`);

      // Store items in DB
      for (const item of allItems) {
        insertItem(db, {
          id: nanoid(),
          ...item,
        });
      }

      // ==================== PHASE 2: ANALYZE ====================
      if (!options.dryRun) {
        console.log('[Phase 2] Running The Watchman...\n');

        const unanalyzed = getUnanalyzedItems(db);
        if (unanalyzed.length > 0) {
          // Get current hypotheses from DB (simplified — read all active)
          const hypotheses: Array<{ claim: string; confidence: number; domain: string | null }> = [];

          const watchmanInput = unanalyzed.map((item) => ({
            url: item.url,
            title: item.title,
            source_name: item.source_id, // TODO: join with sources table
            content_summary: item.content_summary,
          }));

          const analysis = await runWatchman(watchmanInput, projectsConfig, hypotheses);

          // Update items with analysis
          for (const analyzed of analysis.items) {
            const dbItem = unanalyzed.find((i) => i.url === analyzed.url);
            if (dbItem) {
              updateItemAnalysis(db, dbItem.id, {
                significance_score: analyzed.significance_score,
                voyager_relevance_score: analyzed.voyager_relevance_score,
                actionability_score: analyzed.actionability_score,
                threat_score: analyzed.threat_score,
                composite_score: analyzed.composite_score ?? 0,
                confidence: analyzed.confidence,
                watchman_analysis: JSON.stringify(analyzed.analysis),
                watchman_tags: JSON.stringify(analyzed.tags),
                project_mappings: JSON.stringify(analyzed.project_mappings),
                status: 'analyzed',
              });
              itemsAnalyzed++;
            }
          }

          // Handle emergency alerts
          const voyagerPath = process.env.VOYAGER_PATH;
          if (voyagerPath) {
            for (const emergencyUrl of analysis.emergency_items) {
              const item = analysis.items.find((i) => i.url === emergencyUrl);
              const dbItem = unanalyzed.find((i) => i.url === emergencyUrl);
              if (item && dbItem) {
                const alert = generateEmergencyAlert({ ...item, title: dbItem.title, source_name: dbItem.source_id });
                writeEmergency(voyagerPath, dbItem.title, alert);
              }
            }
          }

          console.log(`[Phase 2] Analyzed: ${itemsAnalyzed} items`);

          // ==================== PHASE 3: REPORTS ====================
          await generateReports(db, analysis, projectsConfig, itemsScraped, allSources.length);
        } else {
          console.log('[Phase 2] No unanalyzed items. Skipping.');
        }
      } else {
        console.log('[Phase 2] Dry run — skipping analysis.\n');
      }
    } else {
      // Report-only mode
      console.log(`[Report] Generating ${options.reportOnly} report from existing data...\n`);
      await generateReports(db, null, projectsConfig, 0, 0, options.reportOnly);
    }
  } catch (err: any) {
    console.error('\n[ERROR] Pipeline failed:', err.message);
    errors.push(err.message);
  }

  // Complete run
  completeRun(db, runId, {
    items_scraped: itemsScraped,
    items_analyzed: itemsAnalyzed,
    digest_generated: true,
    report_generated: false,
    errors: errors.length > 0 ? JSON.stringify(errors) : undefined,
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Pipeline complete in ${elapsed}s`);
  console.log(`  Scraped: ${itemsScraped} | Analyzed: ${itemsAnalyzed} | Errors: ${errors.length}`);
  console.log('='.repeat(60));
}

async function generateReports(
  db: ReturnType<typeof getDb>,
  analysis: any,
  projects: Array<{ name: string; keywords: string[]; stack: string[] }>,
  totalScraped: number,
  totalSources: number,
  reportType?: string,
): Promise<void> {
  const voyagerPath = process.env.VOYAGER_PATH;
  const now = new Date();
  const periodEnd = now.toISOString().split('T')[0];
  const periodStart = new Date(now.getTime() - 3.5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Get items for digest
  const since = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
  const digestItems = getItemsForDigest(db, since);

  const shouldDigest = !reportType || reportType === 'digest';
  const shouldComprehensive = reportType === 'comprehensive' ||
    (!reportType && now.getDay() === 5 && Math.floor(now.getDate() / 7) % 2 === 0);

  // Generate digest
  if (shouldDigest && digestItems.length > 0) {
    console.log('[Phase 3] Generating digest...');

    const digestContent = generateDigest({
      items: digestItems.map((item) => ({
        title: item.title,
        url: item.url,
        source_name: item.source_id,
        composite_score: item.composite_score ?? 0,
        significance_score: item.significance_score ?? 0,
        analysis: item.watchman_analysis ? JSON.parse(item.watchman_analysis) : '',
        project_mappings: item.project_mappings ? JSON.parse(item.project_mappings) : [],
        tags: item.watchman_tags ? JSON.parse(item.watchman_tags) : [],
      })),
      analysis: analysis ?? { items: [], new_hypotheses: [], emergency_items: [], digest_summary: '' },
      totalScraped,
      totalSources,
      period: { start: periodStart, end: periodEnd },
    });

    // Write to Voyager
    if (voyagerPath) {
      writeDigest(voyagerPath, digestContent);
    }

    // Send email
    const email = process.env.NOTIFICATION_EMAIL;
    if (email) {
      const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      await sendEmailReport({
        to: email,
        subject: `[Great Wall] AI Digest — ${dayName}, ${dateStr}`,
        markdownContent: digestContent,
      });
    }

    console.log('[Phase 3] Digest complete.');
  }

  // Generate comprehensive report (biweekly)
  if (shouldComprehensive) {
    console.log('[Phase 3] Generating comprehensive report...');

    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const reportItems = getItemsForDigest(db, twoWeeksAgo);

    const reportContent = await generateComprehensiveReport({
      items: reportItems.map((item) => ({
        title: item.title,
        url: item.url,
        source_name: item.source_id,
        composite_score: item.composite_score ?? 0,
        significance_score: item.significance_score ?? 0,
        voyager_relevance_score: item.voyager_relevance_score ?? 0,
        actionability_score: item.actionability_score ?? 0,
        threat_score: item.threat_score ?? 0,
        analysis: item.watchman_analysis ? JSON.parse(item.watchman_analysis) : '',
        tags: item.watchman_tags ? JSON.parse(item.watchman_tags) : [],
        project_mappings: item.project_mappings ? JSON.parse(item.project_mappings) : [],
        confidence: item.confidence ?? 'unverified',
      })),
      hypotheses: [],
      trends: [],
      period: {
        start: twoWeeksAgo.toISOString().split('T')[0],
        end: periodEnd,
      },
      totalScraped,
      totalSources,
    });

    if (voyagerPath) {
      writeReport(voyagerPath, reportContent);
    }

    const email = process.env.NOTIFICATION_EMAIL;
    if (email) {
      await sendEmailReport({
        to: email,
        subject: `[Great Wall] AI Intelligence Report — ${periodStart} to ${periodEnd}`,
        markdownContent: reportContent,
      });
    }

    console.log('[Phase 3] Comprehensive report complete.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
