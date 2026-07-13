import { eq } from 'drizzle-orm';
import { db } from './db';
import { settings } from './schema';

export function getSetting(key: string): string | null {
	return db.select().from(settings).where(eq(settings.key, key)).get()?.value ?? null;
}

export function setSetting(key: string, value: string) {
	db.insert(settings)
		.values({ key, value })
		.onConflictDoUpdate({ target: settings.key, set: { value } })
		.run();
}

export const DEFAULT_TREE_NAME = 'Family tree';

export function getTreeName(): string {
	return getSetting('treeName') ?? DEFAULT_TREE_NAME;
}
