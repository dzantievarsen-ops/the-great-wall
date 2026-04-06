import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Project root: packages/core/src/storage -> ../../../../
const PROJECT_ROOT = resolve(__dirname, '..', '..', '..', '..');
const DEFAULT_DB_PATH = resolve(PROJECT_ROOT, 'data', 'greatwall.db');

type DbInstance = BetterSQLite3Database<typeof schema>;

let _db: DbInstance | null = null;
let _sqlite: InstanceType<typeof Database> | null = null;

/**
 * SQL statements to bootstrap the database.
 * Drizzle's push/migrate requires drizzle-kit CLI; for a self-contained
 * local-first tool we create tables directly on first connection.
 */
const INIT_SQL = `
  CREATE TABLE IF NOT EXISTS sources (
    id                TEXT PRIMARY KEY,
    type              TEXT NOT NULL CHECK (type IN ('youtube', 'substack', 'web')),
    name              TEXT NOT NULL,
    url               TEXT NOT NULL,
    handle            TEXT,
    priority          TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    category          TEXT NOT NULL,
    active            INTEGER NOT NULL DEFAULT 1,
    credibility_score REAL    NOT NULL DEFAULT 0.5,
    total_items       INTEGER NOT NULL DEFAULT 0,
    useful_items      INTEGER NOT NULL DEFAULT 0,
    last_scraped_at   TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS items (
    id                      TEXT PRIMARY KEY,
    source_id               TEXT NOT NULL REFERENCES sources(id),
    title                   TEXT NOT NULL,
    url                     TEXT NOT NULL UNIQUE,
    content_summary         TEXT,
    full_content            TEXT,
    published_at            TEXT,
    scraped_at              TEXT NOT NULL DEFAULT (datetime('now')),
    significance_score      REAL,
    voyager_relevance_score REAL,
    actionability_score     REAL,
    threat_score            REAL,
    composite_score         REAL,
    confidence              TEXT,
    watchman_analysis       TEXT,
    watchman_tags           TEXT,
    project_mappings        TEXT,
    user_rating             INTEGER,
    user_notes              TEXT,
    is_bookmarked           INTEGER NOT NULL DEFAULT 0,
    status                  TEXT NOT NULL DEFAULT 'scraped',
    digest_id               TEXT,
    report_id               TEXT
  );

  CREATE TABLE IF NOT EXISTS reports (
    id               TEXT PRIMARY KEY,
    type             TEXT NOT NULL CHECK (type IN ('digest', 'comprehensive', 'emergency')),
    title            TEXT NOT NULL,
    content_markdown TEXT NOT NULL,
    items_included   TEXT,
    generated_at     TEXT NOT NULL DEFAULT (datetime('now')),
    period_start     TEXT,
    period_end       TEXT
  );

  CREATE TABLE IF NOT EXISTS hypotheses (
    id                     TEXT PRIMARY KEY,
    claim                  TEXT NOT NULL,
    domain                 TEXT,
    status                 TEXT NOT NULL DEFAULT 'active',
    confidence             REAL NOT NULL DEFAULT 0.5,
    supporting_evidence    TEXT,
    contradicting_evidence TEXT,
    created_at             TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trends (
    id              TEXT PRIMARY KEY,
    term            TEXT NOT NULL,
    first_seen      TEXT,
    mention_count   INTEGER NOT NULL DEFAULT 1,
    velocity        REAL    NOT NULL DEFAULT 0,
    historical_avg  REAL    NOT NULL DEFAULT 0,
    is_accelerating INTEGER NOT NULL DEFAULT 0,
    last_updated    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS actions (
    id          TEXT PRIMARY KEY,
    item_id     TEXT REFERENCES items(id),
    project     TEXT,
    description TEXT NOT NULL,
    priority    TEXT,
    status      TEXT NOT NULL DEFAULT 'pending',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS runs (
    id               TEXT PRIMARY KEY,
    started_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    completed_at     TEXT,
    items_scraped    INTEGER NOT NULL DEFAULT 0,
    items_analyzed   INTEGER NOT NULL DEFAULT 0,
    digest_generated INTEGER NOT NULL DEFAULT 0,
    report_generated INTEGER NOT NULL DEFAULT 0,
    errors           TEXT
  );

  -- Full-text search on items
  CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
    title,
    content_summary,
    watchman_analysis,
    content='items',
    content_rowid='rowid'
  );

  -- Triggers to keep FTS index in sync
  CREATE TRIGGER IF NOT EXISTS items_fts_insert AFTER INSERT ON items BEGIN
    INSERT INTO items_fts(rowid, title, content_summary, watchman_analysis)
    VALUES (NEW.rowid, NEW.title, NEW.content_summary, NEW.watchman_analysis);
  END;

  CREATE TRIGGER IF NOT EXISTS items_fts_delete AFTER DELETE ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, title, content_summary, watchman_analysis)
    VALUES ('delete', OLD.rowid, OLD.title, OLD.content_summary, OLD.watchman_analysis);
  END;

  CREATE TRIGGER IF NOT EXISTS items_fts_update AFTER UPDATE ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, title, content_summary, watchman_analysis)
    VALUES ('delete', OLD.rowid, OLD.title, OLD.content_summary, OLD.watchman_analysis);
    INSERT INTO items_fts(rowid, title, content_summary, watchman_analysis)
    VALUES (NEW.rowid, NEW.title, NEW.content_summary, NEW.watchman_analysis);
  END;

  -- Indexes for common query patterns
  CREATE INDEX IF NOT EXISTS idx_items_source_id ON items(source_id);
  CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
  CREATE INDEX IF NOT EXISTS idx_items_composite_score ON items(composite_score);
  CREATE INDEX IF NOT EXISTS idx_items_scraped_at ON items(scraped_at);
  CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
  CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at);
`;

/**
 * Initialize database: create tables, FTS, triggers, and indexes.
 */
function bootstrap(sqlite: InstanceType<typeof Database>): void {
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.exec(INIT_SQL);
}

/**
 * Open (or create) the SQLite database and return a typed Drizzle instance.
 */
export function createDb(dbPath?: string): DbInstance {
  const resolvedPath = dbPath ?? DEFAULT_DB_PATH;

  // Ensure the parent directory exists
  mkdirSync(dirname(resolvedPath), { recursive: true });

  const sqlite = new Database(resolvedPath);
  bootstrap(sqlite);

  return drizzle(sqlite, { schema });
}

/**
 * Singleton accessor. Returns the same Drizzle instance across the process.
 */
export function getDb(dbPath?: string): DbInstance {
  if (!_db) {
    const resolvedPath = dbPath ?? DEFAULT_DB_PATH;
    mkdirSync(dirname(resolvedPath), { recursive: true });

    _sqlite = new Database(resolvedPath);
    bootstrap(_sqlite);
    _db = drizzle(_sqlite, { schema });
  }
  return _db;
}

/**
 * Close the singleton connection (useful in tests / graceful shutdown).
 */
export function closeDb(): void {
  if (_sqlite) {
    _sqlite.close();
    _sqlite = null;
    _db = null;
  }
}
