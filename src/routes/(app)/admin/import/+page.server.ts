import { fail } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/guards';
import { listPeople, replaceTree } from '$lib/server/people';
import { parseGedcom } from '$lib/server/gedcom';
import type { Actions, PageServerLoad } from './$types';

// Generous: an export with embedded photos can be large (base64 inflates
// media by ~a third). The server must also allow bodies this big — see
// BODY_SIZE_LIMIT in docker-compose.yml.
const MAX_BYTES = 250 * 1024 * 1024; // 250 MB

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);
	return { currentCount: listPeople().length };
};

export const actions: Actions = {
	import: async ({ request, locals }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const file = data.get('gedcom');

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'Please choose a GEDCOM (.ged) file.' });
		}
		if (file.size > MAX_BYTES) {
			return fail(400, { error: 'That file is too large (max 250 MB).' });
		}

		const text = await file.text();
		const parsed = parseGedcom(text);

		if (parsed.people.length === 0) {
			return fail(400, {
				error: 'No individuals found — this does not look like a valid GEDCOM file.'
			});
		}

		const result = await replaceTree(parsed);
		return {
			imported: {
				people: result.people,
				relationships: result.relationships,
				events: result.events,
				photos: result.photos,
				filename: file.name
			}
		};
	}
};
