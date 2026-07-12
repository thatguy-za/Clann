import { fail } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/guards';
import { listPeople, createPerson, deletePerson } from '$lib/server/people';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);
	return { people: listPeople() };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const givenName = (data.get('givenName') ?? '').toString().trim();
		const sexRaw = (data.get('sex') ?? '').toString();
		if (!givenName) return fail(400, { error: 'Given name is required.' });
		const sex = sexRaw === 'male' ? 'male' : sexRaw === 'female' ? 'female' : null;

		const id = createPerson({
			givenName,
			familyName: (data.get('familyName') ?? '').toString(),
			sex,
			birthDate: (data.get('birthDate') ?? '').toString()
		});
		return { created: id };
	},

	delete: async ({ request, locals }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const id = (data.get('id') ?? '').toString();
		if (id) await deletePerson(id);
		return { deleted: true };
	}
};
