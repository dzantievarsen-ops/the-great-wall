import { eq, gte, sql, desc, and } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { nanoid } from 'nanoid';
import * as schema from './schema.js';
import { sources, items, runs } from './schema.js';

type Db = BetterSQLite3Database<typeof schema>;

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export type NewSource = typeof sources.$inferInsert;

export function insertSource(db: Db, source: Omit<NewSource, 'id'> & { id?: string }) {
  const id = source.id ?? nanoid();
  return db.insert(sources).values({ ...source, id }).returning().get();
}

export function getSourceStats(db: Db) {
  return db
    .select({
      id: sources.id,
      name: sources.name,
      type: sources.type,
      category: sources.category,
      priority: sources.priority,
      active: sources.active,
      total_items: sources.total_items,
      useful_items: sources.useful_items,
      credibility_score: sources.credibility_score,
      last_scraped_at: sources.last_scraped_at,
      item_count: sql<number>`(SELECT count(*) FROM items WHERE items.source_id = sources.id)`,
      avg_rating: sql<number>`(SELECT avg(user_rating) FROM items WHERE items.source_id = sources.id AND user_rating IS NOT NULL)`,
    })
    .from(sources)
    .all();
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export type NewItem = typeof items.$inferInsert;

/**
 * Insert an item, or update it if the URL already exists (upsert on url).
 */
export function insertItem(db: Db, item: Omit<NewItem, 'id'> & { id?: string }) {
  const id = item.id ?? nanoid();
  return db
    .insert(items)
    .values({ ...item, id })
    .onConflictDoUpdate({
      target: items.url,
      set: {
        title: sql`excluded.title`,
        content_summary: sql`excluded.content_summary`,
        full_content: sql`excluded.full_content`,
        published_at: sql`excluded.published_at`,
        scraped_at: sql`excluded.scraped_at`,
      },
    })
    .returning()
    .get();
}

/**
 * Items that have been scraped but not yet analyzed by the Watchman.
 */
export function getUnanalyzedItems(db: Db) {
  return db
    .select()
    .from(items)
    .where(eq(items.status, 'scraped'))
    .orderBy(desc(items.scraped_at))
    .all();
}

export interface ItemAnalysis {
  significance_score?: number;
  voyager_relevance_score?: number;
  actionability_score?: number;
  threat_score?: number;
  composite_score?: number;
  confidence?: string;
  watchman_analysis?: string;  // JSON string
  watchman_tags?: string;      // JSON string
  project_mappings?: string;   // JSON string
  status?: string;
}

/**
 * Update an item with Watchman analysis results.
 */
export function updateItemAnalysis(db: Db, id: string, analysis: ItemAnalysis) {
  return db
    .update(items)
    .set({
      ...analysis,
      status: analysis.status ?? 'analyzed',
    })
    .where(eq(items.id, id))
    .returning()
    .get();
}

/**
 * Items with composite score >= 5.0 since a given date, for digest generation.
 */
export function getItemsForDigest(db: Db, since: Date) {
  const sinceISO = since.toISOString();
  return db
    .select()
    .from(items)
    .where(
      and(
        gte(items.composite_score, 5.0),
        gte(items.scraped_at, sinceISO),
      ),
    )
    .orderBy(desc(items.composite_score))
    .all();
}

// ---------------------------------------------------------------------------
// Full-Text Search
// ---------------------------------------------------------------------------

/**
 * Search items using the FTS5 index. Returns matching items ordered by rank.
 */
export function searchItems(db: Db, query: string) {
  // FTS5 query via raw SQL — Drizzle doesn't natively support virtual tables
  const stmt = sql`
    SELECT items.*
    FROM items_fts
    JOIN items ON items.rowid = items_fts.rowid
    WHERE items_fts MATCH ${query}
    ORDER BY rank
    LIMIT 50
  `;
  return db.all(stmt);
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

/**
 * Create a new pipeline run record and return its ID.
 */
export function insertRun(db: Db) {
  const id = nanoid();
  return db.insert(runs).values({ id }).returning().get();
}

export interface RunStats {
  items_scraped?: number;
  items_analyzed?: number;
  digest_generated?: boolean;
  report_generated?: boolean;
  errors?: string; // JSON string
}

/**
 * Mark a run as completed with final stats.
 */
export function completeRun(db: Db, id: string, stats: RunStats) {
  return db
    .update(runs)
    .set({
      ...stats,
      completed_at: new Date().toISOString(),
    })
    .where(eq(runs.id, id))
    .returning()
    .get();
}

/**
 * Most recent pipeline runs.
 */
export function getRecentRuns(db: Db, limit = 10) {
  return db
    .select()
    .from(runs)
    .orderBy(desc(runs.started_at))
    .limit(limit)
    .all();
}
