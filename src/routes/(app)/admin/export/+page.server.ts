import { requireAdmin } from '$lib/server/guards';
import { listPeople } from '$lib/server/people';
import { db } from '$lib/server/db';
import { photos } from '$lib/server/schema';
import { sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);
	const photoCount = db.select({ n: sql<number>`count(*)` }).from(photos).get()?.n ?? 0;
	return { peopleCount: listPeople().length, photoCount };
};
