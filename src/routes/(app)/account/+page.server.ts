import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users } from '$lib/server/schema';
import { verifyPassword, hashPassword } from '$lib/server/auth';
import type { Actions } from './$types';

export const actions: Actions = {
	changePassword: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not signed in.' });
		const data = await request.formData();
		const current = (data.get('currentPassword') ?? '').toString();
		const next = (data.get('newPassword') ?? '').toString();
		const confirm = (data.get('confirm') ?? '').toString();

		if (next.length < 8) return fail(400, { error: 'New password must be at least 8 characters.' });
		if (next !== confirm) return fail(400, { error: 'New passwords do not match.' });

		const row = db.select().from(users).where(eq(users.id, locals.user.id)).get();
		if (!row) return fail(400, { error: 'Account not found.' });
		if (!(await verifyPassword(current, row.passwordHash))) {
			return fail(400, { error: 'Your current password is incorrect.' });
		}

		await db
			.update(users)
			.set({ passwordHash: await hashPassword(next) })
			.where(eq(users.id, locals.user.id))
			.run();
		return { saved: true };
	}
};
