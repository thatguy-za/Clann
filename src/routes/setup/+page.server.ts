import { fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/db';
import { users } from '$lib/server/schema';
import { hasAnyUser, markUserCreated } from '$lib/server/setup-state';
import {
	hashPassword,
	generateSessionToken,
	createSession,
	setSessionCookie
} from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// If setup is already done, the hook redirects away; this is a safety net.
	if (hasAnyUser()) throw redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		if (hasAnyUser()) throw redirect(303, '/');

		const data = await request.formData();
		const username = (data.get('username') ?? '').toString().trim();
		const password = (data.get('password') ?? '').toString();
		const confirm = (data.get('confirm') ?? '').toString();

		if (username.length < 3) {
			return fail(400, { username, error: 'Username must be at least 3 characters.' });
		}
		if (password.length < 8) {
			return fail(400, { username, error: 'Password must be at least 8 characters.' });
		}
		if (password !== confirm) {
			return fail(400, { username, error: 'Passwords do not match.' });
		}

		const id = randomUUID();
		await db.insert(users).values({
			id,
			username,
			passwordHash: await hashPassword(password),
			role: 'admin',
			createdAt: new Date()
		});
		markUserCreated();

		const token = generateSessionToken();
		const session = await createSession(token, id);
		setSessionCookie(cookies, token, session.expiresAt);

		throw redirect(303, '/');
	}
};
