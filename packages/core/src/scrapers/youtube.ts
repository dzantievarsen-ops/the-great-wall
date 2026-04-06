import { XMLParser } from 'fast-xml-parser';
import type { SourceConfig, ScrapedItem } from './types.js';
import type { AgentsConfig } from '../agents/types.js';

const MAX_VIDEOS_PER_CHANNEL = 5;
const RATE_LIMIT_MS = 1_000;

type AgentRunner = (agentId: string, prompt: string, config: AgentsConfig) => Promise<string>;

interface YTFeedEntry {
  title: string;
  'yt:videoId': string;
  published: string;
  'media:group'?: {
    'media:description'?: string;
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build the RSS feed URL for a YouTube channel.
 * Tries the @handle format first via the channel page, but the most
 * reliable programmatic approach is the user-based RSS feed.
 */
function buildFeedUrl(source: SourceConfig): string {
  const handle = (source.handle ?? '').replace(/^@/, '');
  return `https://www.youtube.com/feeds/videos.xml?user=${handle}`;
}

/**
 * Fallback: scrape the channel page HTML to find the channel ID,
 * then use the channel_id-based RSS feed.
 */
async function resolveChannelFeed(source: SourceConfig): Promise<string | null> {
  const handle = source.handle ?? '';
  const pageUrl = `https://www.youtube.com/${handle.startsWith('@') ? handle : '@' + handle}/videos`;

  try {
    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GreatWall/1.0)' },
    });
    if (!res.ok) return null;

    const html = await res.text();

    // Look for channel ID in meta tags or canonical data
    const match = html.match(/channel_id=([a-zA-Z0-9_-]{24})/);
    if (match) {
      return `https://www.youtube.com/feeds/videos.xml?channel_id=${match[1]}`;
    }

    // Alternative pattern: "externalId":"UC..."
    const altMatch = html.match(/"externalId":"(UC[a-zA-Z0-9_-]+)"/);
    if (altMatch) {
      return `https://www.youtube.com/feeds/videos.xml?channel_id=${altMatch[1]}`;
    }
  } catch (err) {
    console.warn(`[youtube] Failed to resolve channel page for ${source.name}:`, err);
  }

  return null;
}

/**
 * Fetch and parse a YouTube RSS feed.
 * Returns the raw entry list or null on failure.
 */
async function fetchFeed(feedUrl: string): Promise<YTFeedEntry[] | null> {
  try {
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GreatWall/1.0)' },
    });
    if (!res.ok) return null;

    const xml = await res.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: false,
    });
    const parsed = parser.parse(xml);

    const entries = parsed?.feed?.entry;
    if (!entries) return null;

    return Array.isArray(entries) ? entries : [entries];
  } catch {
    return null;
  }
}

/**
 * Scrape recent videos from YouTube channels via RSS feeds.
 * For each video, calls the agent runner to generate a content summary.
 */
export async function scrapeYouTube(
  sources: SourceConfig[],
  agentRunner: AgentRunner,
  agentsConfig: AgentsConfig,
): Promise<ScrapedItem[]> {
  const activeSources = sources.filter((s) => s.active);
  const results: ScrapedItem[] = [];
  const scrapingAgent = agentsConfig.task_assignments.scraping;

  for (const source of activeSources) {
    console.log(`[youtube] Scraping ${source.name} (${source.handle})...`);

    // Try user-based feed first, fall back to channel ID resolution
    let feedUrl = buildFeedUrl(source);
    let entries = await fetchFeed(feedUrl);

    if (!entries) {
      console.log(`[youtube] User feed failed for ${source.name}, resolving channel ID...`);
      const resolved = await resolveChannelFeed(source);
      if (resolved) {
        entries = await fetchFeed(resolved);
      }
    }

    if (!entries || entries.length === 0) {
      console.warn(`[youtube] No entries found for ${source.name}, skipping.`);
      continue;
    }

    // Take only the most recent videos
    const recent = entries.slice(0, MAX_VIDEOS_PER_CHANNEL);

    for (const entry of recent) {
      const videoId = entry['yt:videoId'];
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const description = entry['media:group']?.['media:description'] ?? '';

      try {
        const prompt = [
          `Summarize this YouTube video in 2-3 concise sentences. Focus on the key announcements, insights, or techniques discussed.`,
          ``,
          `Title: ${entry.title}`,
          `Channel: ${source.name}`,
          `Published: ${entry.published}`,
          `Description: ${description.slice(0, 1000)}`,
          `URL: ${videoUrl}`,
        ].join('\n');

        const summary = await agentRunner(scrapingAgent, prompt, agentsConfig);

        results.push({
          source_id: `youtube:${source.handle}`,
          title: entry.title,
          url: videoUrl,
          content_summary: summary,
          full_content: description || null,
          published_at: entry.published ?? null,
        });
      } catch (err) {
        console.error(`[youtube] Failed to summarize "${entry.title}":`, err);
        // Still include the item without a summary
        results.push({
          source_id: `youtube:${source.handle}`,
          title: entry.title,
          url: videoUrl,
          content_summary: null,
          full_content: description || null,
          published_at: entry.published ?? null,
        });
      }

      await sleep(RATE_LIMIT_MS);
    }

    console.log(`[youtube] Got ${recent.length} videos from ${source.name}`);
  }

  console.log(`[youtube] Total scraped: ${results.length} videos`);
  return results;
}
