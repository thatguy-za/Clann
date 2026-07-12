import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users } from '$lib/server/schema';
import {
	verifyPassword,
	generateSessionToken,
	createSession,
	setSessionCookie
} from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = (data.get('username') ?? '').toString().trim();
		const password = (data.get('password') ?? '').toString();

		const user = db.select().from(users).where(eq(users.username, username)).get();

		// Verify even when the user is missing to keep timing uniform.
		const stored = user?.passwordHash ?? 'x:x';
		const ok = await verifyPassword(password, stored);

		if (!user || !ok) {
			return fail(400, { username, error: 'Invalid username or password.' });
		}

		const token = generateSessionToken();
		const session = await createSession(token, user.id);
		setSessionCookie(cookies, token, session.expiresAt, request);

		throw redirect(303, '/');
	}
};
