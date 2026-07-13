import { error, fail, redirect } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/guards';
import { saveUpload, UploadError } from '$lib/server/uploads';
import {
	getPersonDetail,
	listPeople,
	updatePerson,
	deletePerson,
	addParentChild,
	addSpouse,
	removeRelationship,
	addEvent,
	deleteEvent,
	addPhotoRecord,
	deletePhoto,
	setPrimaryPhoto,
	type PersonInput
} from '$lib/server/people';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const detail = getPersonDetail(params.id);
	if (!detail) throw error(404, 'Person not found');
	const isAdmin = locals.user?.role === 'admin';
	// People list (for relationship pickers) only needed by admins.
	return { detail, isAdmin, allPeople: isAdmin ? listPeople() : [] };
};

function fields(data: FormData): PersonInput {
	return {
		givenName: (data.get('givenName') ?? '').toString(),
		familyName: (data.get('familyName') ?? '').toString(),
		sex: (() => {
			const s = (data.get('sex') ?? '').toString();
			return s === 'male' ? 'male' : s === 'female' ? 'female' : null;
		})(),
		birthDate: (data.get('birthDate') ?? '').toString(),
		deathDate: (data.get('deathDate') ?? '').toString(),
		causeOfDeath: (data.get('causeOfDeath') ?? '').toString(),
		occupation: (data.get('occupation') ?? '').toString(),
		otherNames: (data.get('otherNames') ?? '').toString(),
		bio: (data.get('bio') ?? '').toString(),
		sources: (data.get('sources') ?? '').toString()
	};
}

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const input = fields(data);
		if (!input.givenName.trim()) return fail(400, { error: 'Given name is required.' });
		updatePerson(params.id, input);
		return { saved: true };
	},

	delete: async ({ params, locals }) => {
		requireAdmin(locals);
		await deletePerson(params.id);
		throw redirect(303, '/admin');
	},

	addPhoto: async ({ request, params, locals }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const file = data.get('photo');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'Please choose an image.' });
		}
		try {
			const filename = await saveUpload(file);
			addPhotoRecord(params.id, filename);
		} catch (e) {
			if (e instanceof UploadError) return fail(400, { error: e.message });
			throw e;
		}
		return { saved: true };
	},

	deletePhoto: async ({ request, locals }) => {
		requireAdmin(locals);
		const data = await request.formData();
		await deletePhoto((data.get('photoId') ?? '').toString());
		return { saved: true };
	},

	setPrimaryPhoto: async ({ request, locals }) => {
		requireAdmin(locals);
		const data = await request.formData();
		setPrimaryPhoto((data.get('photoId') ?? '').toString());
		return { saved: true };
	},

	addEvent: async ({ request, params, locals }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const type = (data.get('type') ?? '').toString().trim();
		if (!type) return fail(400, { error: 'Event type is required.' });
		addEvent(params.id, {
			type,
			date: (data.get('date') ?? '').toString(),
			place: (data.get('place') ?? '').toString(),
			description: (data.get('description') ?? '').toString()
		});
		return { saved: true };
	},

	deleteEvent: async ({ request, locals }) => {
		requireAdmin(locals);
		const data = await request.formData();
		deleteEvent((data.get('eventId') ?? '').toString());
		return { saved: true };
	},

	addRelation: async ({ request, params, locals }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const rel = (data.get('rel') ?? '').toString();
		const otherId = (data.get('otherId') ?? '').toString();
		const kind = (data.get('kind') ?? '').toString();
		if (!otherId) return fail(400, { error: 'Select a person.' });

		if (rel === 'parent') addParentChild(otherId, params.id, (kind || 'blood') as never);
		else if (rel === 'child') addParentChild(params.id, otherId, (kind || 'blood') as never);
		else if (rel === 'spouse') addSpouse(params.id, otherId, (kind || 'married') as never);
		else return fail(400, { error: 'Unknown relationship.' });

		return { saved: true };
	},

	removeRelation: async ({ request, locals }) => {
		requireAdmin(locals);
		const data = await request.formData();
		removeRelationship((data.get('relId') ?? '').toString());
		return { saved: true };
	}
};
