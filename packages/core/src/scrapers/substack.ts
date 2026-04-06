import { XMLParser } from 'fast-xml-parser';
import type { SourceConfig, ScrapedItem } from './types.js';
import type { AgentsConfig } from '../agents/types.js';

const MAX_ENTRIES_PER_SOURCE = 3;
const RATE_LIMIT_MS = 1_000;

type AgentRunner = (agentId: string, prompt: string, config: AgentsConfig) => Promise<string>;

interface RSSItem {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  'content:encoded'?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Strip HTML tags to get plain text for summarization prompts.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Scrape recent posts from Substack RSS feeds.
 * For each post, calls the agent runner to generate a summary.
 */
export async function scrapeSubstack(
  sources: SourceConfig[],
  agentRunner: AgentRunner,
  agentsConfig: AgentsConfig,
): Promise<ScrapedItem[]> {
  const activeSources = sources.filter((s) => s.active);
  const results: ScrapedItem[] = [];
  const scrapingAgent = agentsConfig.task_assignments.scraping;

  for (const source of activeSources) {
    const feedUrl = source.url;
    if (!feedUrl) {
      console.warn(`[substack] No URL for ${source.name}, skipping.`);
      continue;
    }

    console.log(`[substack] Scraping ${source.name} (${feedUrl})...`);

    try {
      const res = await fetch(feedUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GreatWall/1.0)' },
      });

      if (!res.ok) {
        console.warn(`[substack] Feed fetch failed for ${source.name}: ${res.status} ${res.statusText}`);
        continue;
      }

      const xml = await res.text();
      const parser = new XMLParser({
        ignoreAttributes: false,
        removeNSPrefix: false,
      });
      const parsed = parser.parse(xml);

      // RSS feeds: rss > channel > item
      const channel = parsed?.rss?.channel;
      if (!channel) {
        console.warn(`[substack] No channel found in feed for ${source.name}`);
        continue;
      }

      let items: RSSItem[] = channel.item ?? [];
      if (!Array.isArray(items)) {
        items = [items];
      }

      const recent = items.slice(0, MAX_ENTRIES_PER_SOURCE);

      for (const item of recent) {
        const title = item.title ?? 'Untitled';
        const link = item.link ?? feedUrl;
        const pubDate = item.pubDate ?? null;

        // Prefer content:encoded (full post), fall back to description
        const rawContent = item['content:encoded'] ?? item.description ?? '';
        const plainContent = stripHtml(rawContent);

        try {
          const prompt = [
            `Summarize this Substack post in 2-3 concise sentences. Focus on the key argument, findings, or insights.`,
            ``,
            `Title: ${title}`,
            `Author: ${source.name}`,
            `Published: ${pubDate ?? 'unknown'}`,
            `Content: ${plainContent.slice(0, 3000)}`,
          ].join('\n');

          const summary = await agentRunner(scrapingAgent, prompt, agentsConfig);

          results.push({
            source_id: `substack:${source.name}`,
            title,
            url: link,
            content_summary: summary,
            full_content: plainContent.slice(0, 5000) || null,
            published_at: pubDate,
          });
        } catch (err) {
          console.error(`[substack] Failed to summarize "${title}":`, err);
          results.push({
            source_id: `substack:${source.name}`,
            title,
            url: link,
            content_summary: null,
            full_content: plainContent.slice(0, 5000) || null,
            published_at: pubDate,
          });
        }

        await sleep(RATE_LIMIT_MS);
      }

      console.log(`[substack] Got ${recent.length} posts from ${source.name}`);
    } catch (err) {
      console.error(`[substack] Failed to scrape ${source.name}:`, err);
    }
  }

  console.log(`[substack] Total scraped: ${results.length} posts`);
  return results;
}
