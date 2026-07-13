import { fail } from '@sveltejs/kit';
import { buildTree } from '$lib/server/buildGraph';
import { requireAdmin } from '$lib/server/guards';
import {
	getPersonDetail,
	createPerson,
	addParentChild,
	addSpouse
} from '$lib/server/people';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return { tree: buildTree(), isAdmin: locals.user?.role === 'admin' };
};

type RelKind = 'parent' | 'child' | 'sibling' | 'spouse';
type RelDef = { sex: 'male' | 'female' | null; kind: RelKind };

// Maps a UI relation choice to the new person's sex (null = ask) and how to
// link them to the anchor. Siblings share the anchor's parents.
const RELATIONS: Record<string, RelDef> = {
	father: { sex: 'male', kind: 'parent' },
	mother: { sex: 'female', kind: 'parent' },
	brother: { sex: 'male', kind: 'sibling' },
	sister: { sex: 'female', kind: 'sibling' },
	son: { sex: 'male', kind: 'child' },
	daughter: { sex: 'female', kind: 'child' },
	partner: { sex: null, kind: 'spouse' }
};

export const actions: Actions = {
	// First-run: create the very first person in an empty tree.
	addFirstPerson: async ({ request, locals }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const givenName = (data.get('givenName') ?? '').toString().trim();
		if (!givenName) return fail(400, { error: 'Please enter a name.' });
		const sexRaw = (data.get('sex') ?? '').toString();
		const sex = sexRaw === 'male' ? 'male' : sexRaw === 'female' ? 'female' : null;
		const id = createPerson({
			givenName,
			familyName: (data.get('familyName') ?? '').toString(),
			sex,
			birthDate: (data.get('birthDate') ?? '').toString()
		});
		return { added: true, newId: id };
	},

	addRelative: async ({ request, locals }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const anchorId = (data.get('anchorId') ?? '').toString();
		const relation = (data.get('relation') ?? '').toString();
		const givenName = (data.get('givenName') ?? '').toString().trim();
		const familyName = (data.get('familyName') ?? '').toString();
		const birthDate = (data.get('birthDate') ?? '').toString();

		const def = RELATIONS[relation];
		if (!def) return fail(400, { error: 'Unknown relationship type.' });

		const anchor = getPersonDetail(anchorId);
		if (!anchor) return fail(400, { error: 'That person no longer exists.' });
		if (!givenName) return fail(400, { error: 'Given name is required.' });

		// Sex is fixed by the relation, except a partner which can be either.
		let sex: 'male' | 'female';
		if (def.sex) {
			sex = def.sex;
		} else {
			const chosen = (data.get('sex') ?? '').toString();
			if (chosen !== 'male' && chosen !== 'female') return fail(400, { error: 'Please select a sex.' });
			sex = chosen;
		}

		// Siblings are derived from shared parents, so the anchor needs one.
		if (def.kind === 'sibling' && anchor.parents.length === 0) {
			return fail(400, {
				error: `${anchor.person.givenName} has no parents recorded yet — add a parent first, then siblings.`
			});
		}

		const newId = createPerson({ givenName, familyName, sex, birthDate });

		if (def.kind === 'parent') {
			addParentChild(newId, anchorId);
		} else if (def.kind === 'child') {
			addParentChild(anchorId, newId);
			// If the anchor has exactly one partner, link the child to that co-parent too.
			if (anchor.spouses.length === 1) addParentChild(anchor.spouses[0].person.id, newId);
		} else if (def.kind === 'sibling') {
			for (const p of anchor.parents) addParentChild(p.person.id, newId);
		} else if (def.kind === 'spouse') {
			const kind = (data.get('spouseKind') ?? 'married').toString();
			addSpouse(anchorId, newId, kind === 'divorced' ? 'divorced' : 'married');
		}

		return { added: true, newId };
	}
};
