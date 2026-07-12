import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

const dbPath = env.DATABASE_PATH ?? 'data/app.db';

// Ensure the parent directory exists (e.g. the mounted /data volume).
mkdirSync(dirname(dbPath), { recursive: true });

// better-sqlite3 is synchronous, so a single connection is correct.
// Stash on globalThis so Vite HMR in dev doesn't open duplicate handles.
const g = globalThis as unknown as { __sqlite?: Database.Database };
const sqlite = g.__sqlite ?? new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
if (import.meta.env.DEV) g.__sqlite = sqlite;

export const db = drizzle(sqlite, { schema });
export { sqlite };
