import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const DB_PATH = resolve(process.cwd(), '..', '..', 'data', 'greatwall.db');

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!db) {
    if (!existsSync(DB_PATH)) {
      throw new Error(
        `Database not found at ${DB_PATH}. Run "pnpm gather" from the project root first.`
      );
    }
    const sqlite = new Database(DB_PATH, { readonly: true });
    sqlite.pragma('journal_mode = WAL');
    db = drizzle(sqlite, { schema });
  }
  return db;
}

export function dbExists(): boolean {
  return existsSync(DB_PATH);
}
