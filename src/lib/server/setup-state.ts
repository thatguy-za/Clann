import { sql } from 'drizzle-orm';
import { db } from './db';
import { users } from './schema';

// Cached so we don't COUNT(*) on every request. Once true it stays true
// (users are never deleted down to zero in normal operation).
let cachedHasUser = false;

export function hasAnyUser(): boolean {
	if (cachedHasUser) return true;
	const row = db.select({ n: sql<number>`count(*)` }).from(users).get();
	cachedHasUser = (row?.n ?? 0) > 0;
	return cachedHasUser;
}

export function markUserCreated() {
	cachedHasUser = true;
}
