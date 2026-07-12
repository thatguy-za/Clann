import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './db';

// Applied once when the server module is first loaded (dev and prod).
// Fails fast if migrations can't be applied.
let done = false;
export function runMigrations() {
	if (done) return;
	migrate(db, { migrationsFolder: './drizzle' });
	done = true;
}

runMigrations();
