import { json } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/guards';
import { setSetting } from '$lib/server/settings';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	requireAdmin(locals);
	const body = await request.json().catch(() => ({}));
	const name = (body?.name ?? '').toString().trim().slice(0, 100);
	if (!name) return json({ error: 'A name is required.' }, { status: 400 });
	setSetting('treeName', name);
	return json({ ok: true, name });
};
