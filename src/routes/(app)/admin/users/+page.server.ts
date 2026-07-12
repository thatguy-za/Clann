import { fail } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users } from '$lib/server/schema';
import { requireAdmin } from '$lib/server/guards';
import { hashPassword } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

function adminCount(): number {
	const row = db
		.select({ n: sql<number>`count(*)` })
		.from(users)
		.where(eq(users.role, 'admin'))
		.get();
	return row?.n ?? 0;
}

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);
	const rows = db
		.select({
			id: users.id,
			username: users.username,
			role: users.role,
			createdAt: users.createdAt
		})
		.from(users)
		.orderBy(users.username)
		.all();
	return { users: rows };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const username = (data.get('username') ?? '').toString().trim();
		const password = (data.get('password') ?? '').toString();
		const role = (data.get('role') ?? 'viewer').toString() === 'admin' ? 'admin' : 'viewer';

		if (username.length < 3) return fail(400, { error: 'Username must be at least 3 characters.' });
		if (password.length < 8) return fail(400, { error: 'Password must be at least 8 characters.' });

		const existing = db.select().from(users).where(eq(users.username, username)).get();
		if (existing) return fail(400, { error: 'That username is already taken.' });

		await db.insert(users).values({
			id: randomUUID(),
			username,
			passwordHash: await hashPassword(password),
			role,
			createdAt: new Date()
		});
		return { created: true };
	},

	setRole: async ({ request, locals }) => {
		const me = requireAdmin(locals);
		const data = await request.formData();
		const id = (data.get('id') ?? '').toString();
		const role = (data.get('role') ?? '').toString() === 'admin' ? 'admin' : 'viewer';

		const target = db.select().from(users).where(eq(users.id, id)).get();
		if (!target) return fail(404, { error: 'User not found.' });
		// Don't allow removing the last admin (including demoting yourself).
		if (target.role === 'admin' && role === 'viewer' && adminCount() <= 1) {
			return fail(400, { error: 'You cannot demote the last admin.' });
		}
		db.update(users).set({ role }).where(eq(users.id, id)).run();
		return { saved: true, self: id === me.id };
	},

	resetPassword: async ({ request, locals }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const id = (data.get('id') ?? '').toString();
		const password = (data.get('password') ?? '').toString();
		if (password.length < 8) return fail(400, { error: 'Password must be at least 8 characters.' });
		const target = db.select().from(users).where(eq(users.id, id)).get();
		if (!target) return fail(404, { error: 'User not found.' });
		db.update(users)
			.set({ passwordHash: await hashPassword(password) })
			.where(eq(users.id, id))
			.run();
		return { saved: true };
	},

	delete: async ({ request, locals }) => {
		const me = requireAdmin(locals);
		const data = await request.formData();
		const id = (data.get('id') ?? '').toString();
		if (id === me.id) return fail(400, { error: 'You cannot delete your own account.' });

		const target = db.select().from(users).where(eq(users.id, id)).get();
		if (!target) return fail(404, { error: 'User not found.' });
		if (target.role === 'admin' && adminCount() <= 1) {
			return fail(400, { error: 'You cannot delete the last admin.' });
		}
		db.delete(users).where(eq(users.id, id)).run();
		return { deleted: true };
	}
};
