import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

/** Enforce admin role in a load or action. Viewers are read-only. */
export function requireAdmin(locals: RequestEvent['locals']) {
	if (!locals.user) throw error(401, 'Not signed in');
	if (locals.user.role !== 'admin') throw error(403, 'Admins only');
	return locals.user;
}
