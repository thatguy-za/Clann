import { redirect, type Handle } from '@sveltejs/kit';
import '$lib/server/migrate'; // runs migrations once on server boot
import {
	SESSION_COOKIE,
	validateSessionToken,
	setSessionCookie,
	deleteSessionCookie
} from '$lib/server/auth';
import { hasAnyUser } from '$lib/server/setup-state';

export const handle: Handle = async ({ event, resolve }) => {
	// --- First-run guard: no users yet -> force everyone to /setup ---
	const setupComplete = hasAnyUser();
	const path = event.url.pathname;

	if (!setupComplete) {
		event.locals.user = null;
		event.locals.session = null;
		if (path !== '/setup') throw redirect(303, '/setup');
		return resolve(event);
	}

	// Setup is done; /setup is no longer reachable.
	if (path === '/setup') throw redirect(303, '/');

	// --- Session validation ---
	const token = event.cookies.get(SESSION_COOKIE);
	if (!token) {
		event.locals.user = null;
		event.locals.session = null;
	} else {
		const { session, user } = await validateSessionToken(token);
		if (session) {
			event.locals.user = user;
			event.locals.session = session;
			// Refresh cookie expiry to match sliding session.
			setSessionCookie(event.cookies, token, session.expiresAt);
		} else {
			event.locals.user = null;
			event.locals.session = null;
			deleteSessionCookie(event.cookies);
		}
	}

	return resolve(event);
};
