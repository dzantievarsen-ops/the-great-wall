import { desc, sql, eq, like, or } from 'drizzle-orm';
import { getDb, dbExists } from './db';
import { items, sources, reports, actions, runs, hypotheses, trends } from './schema';

// ---------------------------------------------------------------------------
// Safety wrapper -- returns empty data when DB doesn't exist yet
// ---------------------------------------------------------------------------

function safe<T>(fn: () => T, fallback: T): T {
  if (!dbExists()) return fallback;
  try {
    return fn();
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Dashboard Stats
// ---------------------------------------------------------------------------

export interface DashboardStats {
  totalItems: number;
  analyzedItems: number;
  avgCompositeScore: number | null;
  activeSources: number;
  totalReports: number;
  pendingActions: number;
  lastRunAt: string | null;
}

export function getDashboardStats(): DashboardStats {
  return safe(() => {
    const db = getDb();

    const totalItems = db.select({ count: sql<number>`count(*)` }).from(items).get()?.count ?? 0;
    const analyzedItems = db.select({ count: sql<number>`count(*)` }).from(items).where(eq(items.status, 'analyzed')).get()?.count ?? 0;
    const avgScore = db.select({ avg: sql<number>`avg(composite_score)` }).from(items).get()?.avg ?? null;
    const activeSources = db.select({ count: sql<number>`count(*)` }).from(sources).where(eq(sources.active, true)).get()?.count ?? 0;
    const totalReports = db.select({ count: sql<number>`count(*)` }).from(reports).get()?.count ?? 0;
    const pendingActions = db.select({ count: sql<number>`count(*)` }).from(actions).where(eq(actions.status, 'pending')).get()?.count ?? 0;
    const lastRun = db.select({ started_at: runs.started_at }).from(runs).orderBy(desc(runs.started_at)).limit(1).get();

    return {
      totalItems,
      analyzedItems,
      avgCompositeScore: avgScore,
      activeSources,
      totalReports,
      pendingActions,
      lastRunAt: lastRun?.started_at ?? null,
    };
  }, {
    totalItems: 0,
    analyzedItems: 0,
    avgCompositeScore: null,
    activeSources: 0,
    totalReports: 0,
    pendingActions: 0,
    lastRunAt: null,
  });
}

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

export function getAllItems() {
  return safe(() => {
    const db = getDb();
    return db
      .select({
        id: items.id,
        title: items.title,
        url: items.url,
        content_summary: items.content_summary,
        published_at: items.published_at,
        scraped_at: items.scraped_at,
        significance_score: items.significance_score,
        voyager_relevance_score: items.voyager_relevance_score,
        actionability_score: items.actionability_score,
        threat_score: items.threat_score,
        composite_score: items.composite_score,
        confidence: items.confidence,
        watchman_analysis: items.watchman_analysis,
        watchman_tags: items.watchman_tags,
        project_mappings: items.project_mappings,
        user_rating: items.user_rating,
        is_bookmarked: items.is_bookmarked,
        status: items.status,
        source_name: sources.name,
        source_type: sources.type,
        source_category: sources.category,
      })
      .from(items)
      .leftJoin(sources, eq(items.source_id, sources.id))
      .orderBy(desc(items.scraped_at))
      .all();
  }, []);
}

export type FeedItem = NonNullable<ReturnType<typeof getAllItems>>[number];

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export function getAllReports() {
  return safe(() => {
    const db = getDb();
    return db.select().from(reports).orderBy(desc(reports.generated_at)).all();
  }, []);
}

export function getReportById(id: string) {
  return safe(() => {
    const db = getDb();
    return db.select().from(reports).where(eq(reports.id, id)).get() ?? null;
  }, null);
}

export function getLatestDigest() {
  return safe(() => {
    const db = getDb();
    return db.select().from(reports).where(eq(reports.type, 'digest')).orderBy(desc(reports.generated_at)).limit(1).get() ?? null;
  }, null);
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export function getAllSources() {
  return safe(() => {
    const db = getDb();
    return db
      .select({
        id: sources.id,
        name: sources.name,
        type: sources.type,
        url: sources.url,
        handle: sources.handle,
        priority: sources.priority,
        category: sources.category,
        active: sources.active,
        credibility_score: sources.credibility_score,
        total_items: sources.total_items,
        useful_items: sources.useful_items,
        last_scraped_at: sources.last_scraped_at,
        item_count: sql<number>`(SELECT count(*) FROM items WHERE items.source_id = sources.id)`,
      })
      .from(sources)
      .orderBy(sources.priority, sources.name)
      .all();
  }, []);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function getRecentActions(limit = 20) {
  return safe(() => {
    const db = getDb();
    return db.select().from(actions).orderBy(desc(actions.created_at)).limit(limit).all();
  }, []);
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

export function getRecentRuns(limit = 10) {
  return safe(() => {
    const db = getDb();
    return db.select().from(runs).orderBy(desc(runs.started_at)).limit(limit).all();
  }, []);
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export function searchItems(query: string) {
  return safe(() => {
    const db = getDb();
    const pattern = `%${query}%`;
    return db
      .select({
        id: items.id,
        title: items.title,
        url: items.url,
        content_summary: items.content_summary,
        composite_score: items.composite_score,
        scraped_at: items.scraped_at,
        watchman_tags: items.watchman_tags,
        source_name: sources.name,
        source_type: sources.type,
      })
      .from(items)
      .leftJoin(sources, eq(items.source_id, sources.id))
      .where(
        or(
          like(items.title, pattern),
          like(items.content_summary, pattern),
          like(items.watchman_tags, pattern),
        )
      )
      .orderBy(desc(items.composite_score))
      .limit(50)
      .all();
  }, []);
}

// ---------------------------------------------------------------------------
// Radar -- Items grouped by Voyager project
// ---------------------------------------------------------------------------

export function getRadarItems() {
  return safe(() => {
    const db = getDb();
    return db
      .select({
        id: items.id,
        title: items.title,
        url: items.url,
        composite_score: items.composite_score,
        voyager_relevance_score: items.voyager_relevance_score,
        project_mappings: items.project_mappings,
        scraped_at: items.scraped_at,
        source_name: sources.name,
        source_type: sources.type,
      })
      .from(items)
      .leftJoin(sources, eq(items.source_id, sources.id))
      .where(sql`items.project_mappings IS NOT NULL AND items.project_mappings != '[]' AND items.project_mappings != 'null'`)
      .orderBy(desc(items.voyager_relevance_score))
      .all();
  }, []);
}

// ---------------------------------------------------------------------------
// Hypotheses
// ---------------------------------------------------------------------------

export function getAllHypotheses() {
  return safe(() => {
    const db = getDb();
    return db.select().from(hypotheses).orderBy(desc(hypotheses.updated_at)).all();
  }, []);
}

// ---------------------------------------------------------------------------
// Trends
// ---------------------------------------------------------------------------

export function getTopTrends(limit = 20) {
  return safe(() => {
    const db = getDb();
    return db.select().from(trends).orderBy(desc(trends.velocity)).limit(limit).all();
  }, []);
}
