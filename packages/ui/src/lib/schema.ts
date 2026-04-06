import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Sources -- YouTube channels, Substacks, news sites
// ---------------------------------------------------------------------------
export const sources = sqliteTable('sources', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['youtube', 'substack', 'web'] }).notNull(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  handle: text('handle'),
  priority: text('priority', { enum: ['critical', 'high', 'medium', 'low'] }).notNull(),
  category: text('category').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  credibility_score: real('credibility_score').notNull().default(0.5),
  total_items: integer('total_items').notNull().default(0),
  useful_items: integer('useful_items').notNull().default(0),
  last_scraped_at: text('last_scraped_at'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ---------------------------------------------------------------------------
// Items -- Individual scraped pieces of content
// ---------------------------------------------------------------------------
export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  source_id: text('source_id').notNull().references(() => sources.id),
  title: text('title').notNull(),
  url: text('url').notNull().unique(),
  content_summary: text('content_summary'),
  full_content: text('full_content'),
  published_at: text('published_at'),
  scraped_at: text('scraped_at').notNull().default(sql`(datetime('now'))`),

  // Watchman scores (0-10)
  significance_score: real('significance_score'),
  voyager_relevance_score: real('voyager_relevance_score'),
  actionability_score: real('actionability_score'),
  threat_score: real('threat_score'),
  composite_score: real('composite_score'),
  confidence: text('confidence'),

  // Watchman structured output (stored as JSON strings)
  watchman_analysis: text('watchman_analysis'),
  watchman_tags: text('watchman_tags'),
  project_mappings: text('project_mappings'),

  // User interaction
  user_rating: integer('user_rating'),
  user_notes: text('user_notes'),
  is_bookmarked: integer('is_bookmarked', { mode: 'boolean' }).notNull().default(false),

  // Pipeline state
  status: text('status').notNull().default('scraped'),
  digest_id: text('digest_id'),
  report_id: text('report_id'),
});

// ---------------------------------------------------------------------------
// Reports -- Digests, comprehensive reports, emergency alerts
// ---------------------------------------------------------------------------
export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['digest', 'comprehensive', 'emergency'] }).notNull(),
  title: text('title').notNull(),
  content_markdown: text('content_markdown').notNull(),
  items_included: text('items_included'), // JSON array of item IDs
  generated_at: text('generated_at').notNull().default(sql`(datetime('now'))`),
  period_start: text('period_start'),
  period_end: text('period_end'),
});

// ---------------------------------------------------------------------------
// Hypotheses -- Tracked claims with supporting/contradicting evidence
// ---------------------------------------------------------------------------
export const hypotheses = sqliteTable('hypotheses', {
  id: text('id').primaryKey(),
  claim: text('claim').notNull(),
  domain: text('domain'),
  status: text('status').notNull().default('active'),
  confidence: real('confidence').notNull().default(0.5),
  supporting_evidence: text('supporting_evidence'), // JSON
  contradicting_evidence: text('contradicting_evidence'), // JSON
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// ---------------------------------------------------------------------------
// Trends -- Term frequency tracking with velocity detection
// ---------------------------------------------------------------------------
export const trends = sqliteTable('trends', {
  id: text('id').primaryKey(),
  term: text('term').notNull(),
  first_seen: text('first_seen'),
  mention_count: integer('mention_count').notNull().default(1),
  velocity: real('velocity').notNull().default(0),
  historical_avg: real('historical_avg').notNull().default(0),
  is_accelerating: integer('is_accelerating', { mode: 'boolean' }).notNull().default(false),
  last_updated: text('last_updated').notNull().default(sql`(datetime('now'))`),
});

// ---------------------------------------------------------------------------
// Actions -- Extracted action items linked to Voyager projects
// ---------------------------------------------------------------------------
export const actions = sqliteTable('actions', {
  id: text('id').primaryKey(),
  item_id: text('item_id').references(() => items.id),
  project: text('project'),
  description: text('description').notNull(),
  priority: text('priority'),
  status: text('status').notNull().default('pending'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ---------------------------------------------------------------------------
// Runs -- Pipeline execution log
// ---------------------------------------------------------------------------
export const runs = sqliteTable('runs', {
  id: text('id').primaryKey(),
  started_at: text('started_at').notNull().default(sql`(datetime('now'))`),
  completed_at: text('completed_at'),
  items_scraped: integer('items_scraped').notNull().default(0),
  items_analyzed: integer('items_analyzed').notNull().default(0),
  digest_generated: integer('digest_generated', { mode: 'boolean' }).notNull().default(false),
  report_generated: integer('report_generated', { mode: 'boolean' }).notNull().default(false),
  errors: text('errors'), // JSON
});
