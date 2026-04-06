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
 * Strip HTML tags to get plain text.
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
 * Fetch and parse an RSS feed, returning the recent items.
 */
async function fetchRSS(rssUrl: string): Promise<RSSItem[]> {
  const res = await fetch(rssUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GreatWall/1.0)' },
  });

  if (!res.ok) {
    throw new Error(`RSS fetch failed: ${res.status} ${res.statusText}`);
  }

  const xml = await res.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: false,
  });
  const parsed = parser.parse(xml);

  // Handle both RSS (rss > channel > item) and Atom (feed > entry) formats
  let items: RSSItem[];

  if (parsed?.rss?.channel?.item) {
    const raw = parsed.rss.channel.item;
    items = Array.isArray(raw) ? raw : [raw];
  } else if (parsed?.feed?.entry) {
    const raw = parsed.feed.entry;
    const entries = Array.isArray(raw) ? raw : [raw];
    // Normalize Atom entries to RSS-like shape
    items = entries.map((e: Record<string, unknown>) => ({
      title: e.title as string,
      link: typeof e.link === 'object' && e.link !== null
        ? (e.link as Record<string, string>)['@_href']
        : (e.link as string),
      pubDate: (e.published ?? e.updated) as string,
      description: (e.summary ?? e.content) as string,
    }));
  } else {
    return [];
  }

  return items.slice(0, MAX_ENTRIES_PER_SOURCE);
}

/**
 * Scrape a web page directly (no RSS), extracting content via the agent.
 */
async function scrapePageDirectly(
  source: SourceConfig,
  agentRunner: AgentRunner,
  agentsConfig: AgentsConfig,
  scrapingAgent: string,
): Promise<ScrapedItem[]> {
  const url = source.url;
  if (!url) return [];

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GreatWall/1.0)' },
    });

    if (!res.ok) {
      console.warn(`[web] Page fetch failed for ${source.name}: ${res.status}`);
      return [];
    }

    const html = await res.text();

    // Trim HTML to a reasonable size for the agent
    const trimmedHtml = html.slice(0, 15_000);

    const prompt = [
      `Extract the 3 most recent articles or posts from this web page HTML. For each, provide:`,
      `- Title`,
      `- URL (absolute)`,
      `- A 2-sentence summary`,
      `- Published date (if visible)`,
      ``,
      `Format each as:`,
      `TITLE: ...`,
      `URL: ...`,
      `DATE: ...`,
      `SUMMARY: ...`,
      `---`,
      ``,
      `Website: ${source.name} (${url})`,
      `HTML:`,
      trimmedHtml,
    ].join('\n');

    const output = await agentRunner(scrapingAgent, prompt, agentsConfig);

    // Parse the agent's structured output into ScrapedItems
    const items: ScrapedItem[] = [];
    const blocks = output.split('---').filter((b) => b.trim());

    for (const block of blocks) {
      const titleMatch = block.match(/TITLE:\s*(.+)/);
      const urlMatch = block.match(/URL:\s*(.+)/);
      const dateMatch = block.match(/DATE:\s*(.+)/);
      const summaryMatch = block.match(/SUMMARY:\s*(.+)/);

      if (titleMatch) {
        items.push({
          source_id: `web:${source.name}`,
          title: titleMatch[1].trim(),
          url: urlMatch?.[1]?.trim() ?? url,
          content_summary: summaryMatch?.[1]?.trim() ?? null,
          full_content: null,
          published_at: dateMatch?.[1]?.trim() ?? null,
        });
      }
    }

    return items;
  } catch (err) {
    console.error(`[web] Failed to scrape page for ${source.name}:`, err);
    return [];
  }
}

/**
 * Scrape recent content from web sources.
 * Uses RSS when available, falls back to direct page scraping via agent.
 */
export async function scrapeWeb(
  sources: SourceConfig[],
  agentRunner: AgentRunner,
  agentsConfig: AgentsConfig,
): Promise<ScrapedItem[]> {
  const activeSources = sources.filter((s) => s.active);
  const results: ScrapedItem[] = [];
  const scrapingAgent = agentsConfig.task_assignments.scraping;

  for (const source of activeSources) {
    console.log(`[web] Scraping ${source.name}...`);

    // Path A: RSS feed available
    if (source.rss) {
      try {
        const items = await fetchRSS(source.rss);

        for (const item of items) {
          const title = item.title ?? 'Untitled';
          const link = item.link ?? source.url ?? '';
          const pubDate = item.pubDate ?? null;
          const rawContent = item['content:encoded'] ?? item.description ?? '';
          const plainContent = stripHtml(rawContent);

          try {
            const prompt = [
              `Summarize this article in 2-3 concise sentences. Focus on the key argument or findings.`,
              ``,
              `Title: ${title}`,
              `Source: ${source.name}`,
              `Published: ${pubDate ?? 'unknown'}`,
              `Content: ${plainContent.slice(0, 3000)}`,
            ].join('\n');

            const summary = await agentRunner(scrapingAgent, prompt, agentsConfig);

            results.push({
              source_id: `web:${source.name}`,
              title,
              url: link,
              content_summary: summary,
              full_content: plainContent.slice(0, 5000) || null,
              published_at: pubDate,
            });
          } catch (err) {
            console.error(`[web] Failed to summarize "${title}":`, err);
            results.push({
              source_id: `web:${source.name}`,
              title,
              url: link,
              content_summary: null,
              full_content: plainContent.slice(0, 5000) || null,
              published_at: pubDate,
            });
          }

          await sleep(RATE_LIMIT_MS);
        }

        console.log(`[web] Got ${items.length} articles from ${source.name} (RSS)`);
      } catch (err) {
        console.error(`[web] RSS fetch failed for ${source.name}, trying direct scrape:`, err);
        // Fall through to direct scraping
        const items = await scrapePageDirectly(source, agentRunner, agentsConfig, scrapingAgent);
        results.push(...items);
        await sleep(RATE_LIMIT_MS);
      }
    } else {
      // Path B: No RSS, scrape the page directly via agent
      const items = await scrapePageDirectly(source, agentRunner, agentsConfig, scrapingAgent);
      results.push(...items);
      await sleep(RATE_LIMIT_MS);
      console.log(`[web] Got ${items.length} articles from ${source.name} (direct scrape)`);
    }
  }

  console.log(`[web] Total scraped: ${results.length} articles`);
  return results;
}
