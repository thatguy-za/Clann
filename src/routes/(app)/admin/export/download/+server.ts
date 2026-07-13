import { requireAdmin } from '$lib/server/guards';
import { exportGedcom } from '$lib/server/gedcomExport';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	requireAdmin(locals);
	const gedcom = await exportGedcom(new Date());
	return new Response(gedcom, {
		headers: {
			'Content-Type': 'text/vnd.familysearch.gedcom; charset=utf-8',
			'Content-Disposition': 'attachment; filename="clann-family-tree.ged"',
			'Cache-Control': 'no-store'
		}
	});
};
