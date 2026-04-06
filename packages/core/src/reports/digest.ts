import type { WatchmanAnalysis } from '../watchman/types.js';

interface DigestItem {
  title: string;
  url: string;
  source_name: string;
  composite_score: number;
  significance_score: number;
  analysis: string;
  project_mappings: Array<{ project: string; action: string }>;
  tags: string[];
}

interface DigestInput {
  items: DigestItem[];
  analysis: WatchmanAnalysis;
  totalScraped: number;
  totalSources: number;
  period: { start: string; end: string };
}

/**
 * Generate a brief digest (~500 words, fits on 1 A4 page at font 10)
 */
export function generateDigest(input: DigestInput): string {
  const { items, analysis, totalScraped, totalSources, period } = input;
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Sort by composite score descending, take top 5
  const topItems = [...items]
    .sort((a, b) => b.composite_score - a.composite_score)
    .slice(0, 5);

  // Emergency items
  const emergencies = items.filter((i) => i.composite_score >= 9.0);

  // Collect all action items
  const actions: string[] = [];
  for (const item of topItems) {
    for (const mapping of item.project_mappings) {
      actions.push(`${mapping.action} [${mapping.project}]`);
    }
  }

  // Collect trend terms
  const trendTerms = new Map<string, number>();
  for (const item of analysis.items) {
    for (const term of item.trend_terms ?? []) {
      trendTerms.set(term, (trendTerms.get(term) ?? 0) + 1);
    }
  }
  const topTrends = [...trendTerms.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Build markdown
  const lines: string[] = [];

  lines.push(`# The Great Wall — Intelligence Digest`);
  lines.push(`## ${dayName}, ${dateStr}`);
  lines.push('');

  // Emergency section
  if (emergencies.length > 0) {
    lines.push(`### Priority Alerts (${emergencies.length})`);
    for (const e of emergencies) {
      lines.push(`- **${e.title}** (Score: ${e.composite_score.toFixed(1)}) — ${e.analysis.slice(0, 100)}...`);
    }
    lines.push('');
  } else {
    lines.push('### Priority Alerts');
    lines.push('_No emergency items this period._');
    lines.push('');
  }

  // Top developments
  lines.push(`### Top ${topItems.length} Developments`);
  lines.push('');
  for (let i = 0; i < topItems.length; i++) {
    const item = topItems[i];
    const projectList = item.project_mappings.map((m) => m.project).join(', ');
    lines.push(`${i + 1}. **${item.title}** (Significance: ${item.significance_score.toFixed(0)}/10)`);
    lines.push(`   ${item.analysis.slice(0, 150)}`);
    if (item.project_mappings.length > 0) {
      const action = item.project_mappings[0].action;
      lines.push(`   → Voyager: ${action} [${projectList}]`);
    }
    lines.push('');
  }

  // Trend watch
  if (topTrends.length > 0) {
    lines.push('### Trend Watch');
    for (const [term, count] of topTrends) {
      lines.push(`- "${term}" — ${count} mentions this period`);
    }
    lines.push('');
  }

  // Action items
  if (actions.length > 0) {
    lines.push('### Action Items');
    for (const action of actions.slice(0, 5)) {
      lines.push(`- [ ] ${action}`);
    }
    lines.push('');
  }

  // Summary line
  if (analysis.digest_summary) {
    lines.push('### Summary');
    lines.push(analysis.digest_summary);
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push(`_${totalSources} sources processed | ${totalScraped} items scraped | ${items.length} selected | Period: ${period.start} to ${period.end}_`);

  return lines.join('\n');
}
