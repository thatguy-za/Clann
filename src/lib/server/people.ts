import { randomUUID } from 'node:crypto';
import { and, eq, or, asc } from 'drizzle-orm';
import { db } from './db';
import {
	people,
	relationships,
	lifeEvents,
	photos,
	type Person,
	type Relationship
} from './schema';
import { deleteUpload } from './uploads';
import type { GedcomImport } from './gedcom';

export type PersonInput = {
	givenName: string;
	familyName?: string | null;
	sex: 'male' | 'female';
	birthDate?: string | null;
	deathDate?: string | null;
	occupation?: string | null;
	bio?: string | null;
};

export function listPeople(): Person[] {
	return db.select().from(people).orderBy(asc(people.familyName), asc(people.givenName)).all();
}

export function getPerson(id: string): Person | undefined {
	return db.select().from(people).where(eq(people.id, id)).get();
}

export type RelatedPerson = { relId: string; kind: Relationship['kind']; person: Person };

export type PersonDetail = {
	person: Person;
	photos: { id: string; filename: string; isPrimary: boolean }[];
	events: (typeof lifeEvents.$inferSelect)[];
	parents: RelatedPerson[];
	children: RelatedPerson[];
	spouses: RelatedPerson[];
};

export function getPersonDetail(id: string): PersonDetail | null {
	const person = getPerson(id);
	if (!person) return null;

	const personPhotos = db
		.select()
		.from(photos)
		.where(eq(photos.personId, id))
		.all()
		.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));

	const events = db.select().from(lifeEvents).where(eq(lifeEvents.personId, id)).all();

	const rels = db
		.select()
		.from(relationships)
		.where(or(eq(relationships.fromId, id), eq(relationships.toId, id)))
		.all();

	const parents: RelatedPerson[] = [];
	const children: RelatedPerson[] = [];
	const spouses: RelatedPerson[] = [];

	for (const r of rels) {
		if (r.type === 'parent-child') {
			if (r.toId === id) {
				const p = getPerson(r.fromId);
				if (p) parents.push({ relId: r.id, kind: r.kind, person: p });
			} else {
				const c = getPerson(r.toId);
				if (c) children.push({ relId: r.id, kind: r.kind, person: c });
			}
		} else {
			const otherId = r.fromId === id ? r.toId : r.fromId;
			const s = getPerson(otherId);
			if (s) spouses.push({ relId: r.id, kind: r.kind, person: s });
		}
	}

	return { person, photos: personPhotos, events, parents, children, spouses };
}

// --- Mutations ----------------------------------------------------------

export function createPerson(input: PersonInput): string {
	const id = randomUUID();
	const now = new Date();
	db.insert(people)
		.values({ id, ...normalize(input), createdAt: now, updatedAt: now })
		.run();
	return id;
}

export function updatePerson(id: string, input: PersonInput) {
	db.update(people)
		.set({ ...normalize(input), updatedAt: new Date() })
		.where(eq(people.id, id))
		.run();
}

export async function deletePerson(id: string) {
	// Remove photo files first (DB rows cascade on the FK).
	const owned = db.select().from(photos).where(eq(photos.personId, id)).all();
	await Promise.all(owned.map((p) => deleteUpload(p.filename)));
	db.delete(people).where(eq(people.id, id)).run();
}

function normalize(input: PersonInput) {
	const blankToNull = (v?: string | null) => {
		const t = (v ?? '').toString().trim();
		return t.length ? t : null;
	};
	return {
		givenName: input.givenName.trim(),
		familyName: blankToNull(input.familyName),
		sex: input.sex,
		birthDate: blankToNull(input.birthDate),
		deathDate: blankToNull(input.deathDate),
		occupation: blankToNull(input.occupation),
		bio: blankToNull(input.bio)
	};
}

// Relationships ----------------------------------------------------------

export function addParentChild(
	parentId: string,
	childId: string,
	kind: Relationship['kind'] = 'blood'
) {
	if (parentId === childId) return;
	const exists = db
		.select()
		.from(relationships)
		.where(
			and(
				eq(relationships.type, 'parent-child'),
				eq(relationships.fromId, parentId),
				eq(relationships.toId, childId)
			)
		)
		.get();
	if (exists) return;
	db.insert(relationships)
		.values({ id: randomUUID(), type: 'parent-child', fromId: parentId, toId: childId, kind })
		.run();
}

export function addSpouse(aId: string, bId: string, kind: Relationship['kind'] = 'married') {
	if (aId === bId) return;
	const exists = db
		.select()
		.from(relationships)
		.where(
			and(
				eq(relationships.type, 'spouse'),
				or(
					and(eq(relationships.fromId, aId), eq(relationships.toId, bId)),
					and(eq(relationships.fromId, bId), eq(relationships.toId, aId))
				)
			)
		)
		.get();
	if (exists) return;
	db.insert(relationships)
		.values({ id: randomUUID(), type: 'spouse', fromId: aId, toId: bId, kind })
		.run();
}

export function removeRelationship(relId: string) {
	db.delete(relationships).where(eq(relationships.id, relId)).run();
}

// --- Bulk replace (GEDCOM import) --------------------------------------

export type ReplaceResult = { people: number; relationships: number };

/**
 * Overwrite the ENTIRE tree with imported data: every person, relationship,
 * life event and photo is deleted first, then the import is inserted. The DB
 * work runs in a single transaction so a failure leaves the old data intact.
 * Photo files are removed from disk up front (that part is not transactional).
 */
export async function replaceTree(data: GedcomImport): Promise<ReplaceResult> {
	// Remove photo files first; the DB rows go with the people below.
	const owned = db.select().from(photos).all();
	await Promise.all(owned.map((p) => deleteUpload(p.filename)));

	const now = new Date();
	return db.transaction((tx) => {
		// Explicit deletes in FK order (cascade would cover it, but be explicit).
		tx.delete(photos).run();
		tx.delete(lifeEvents).run();
		tx.delete(relationships).run();
		tx.delete(people).run();

		const idByXref = new Map<string, string>();
		for (const gp of data.people) {
			const id = randomUUID();
			tx.insert(people)
				.values({
					id,
					givenName: gp.givenName.trim() || 'Unknown',
					familyName: gp.familyName?.trim() || null,
					sex: gp.sex,
					birthDate: gp.birthDate,
					deathDate: gp.deathDate,
					createdAt: now,
					updatedAt: now
				})
				.run();
			idByXref.set(gp.xref, id);
		}

		let relCount = 0;
		const seen = new Set<string>();
		const insertRel = (
			type: 'parent-child' | 'spouse',
			fromId: string,
			toId: string,
			kind: Relationship['kind']
		) => {
			// De-dupe (a spouse pair can appear from both directions).
			const key = type === 'spouse' ? [type, ...[fromId, toId].sort()].join(':') : `${type}:${fromId}:${toId}`;
			if (seen.has(key)) return;
			seen.add(key);
			tx.insert(relationships).values({ id: randomUUID(), type, fromId, toId, kind }).run();
			relCount++;
		};

		for (const [parentXref, childXref] of data.parentChild) {
			const parentId = idByXref.get(parentXref);
			const childId = idByXref.get(childXref);
			if (parentId && childId && parentId !== childId) {
				insertRel('parent-child', parentId, childId, 'blood');
			}
		}
		for (const [aXref, bXref] of data.spouses) {
			const aId = idByXref.get(aXref);
			const bId = idByXref.get(bXref);
			if (aId && bId && aId !== bId) {
				insertRel('spouse', aId, bId, 'married');
			}
		}

		return { people: idByXref.size, relationships: relCount };
	});
}

// Life events ------------------------------------------------------------

export function addEvent(
	personId: string,
	e: { type: string; date?: string | null; place?: string | null; description?: string | null }
) {
	db.insert(lifeEvents)
		.values({
			id: randomUUID(),
			personId,
			type: e.type.trim(),
			date: e.date?.trim() || null,
			place: e.place?.trim() || null,
			description: e.description?.trim() || null
		})
		.run();
}

export function deleteEvent(eventId: string) {
	db.delete(lifeEvents).where(eq(lifeEvents.id, eventId)).run();
}

// Photos -----------------------------------------------------------------

export function addPhotoRecord(personId: string, filename: string) {
	const hasPrimary = db
		.select()
		.from(photos)
		.where(and(eq(photos.personId, personId), eq(photos.isPrimary, true)))
		.get();
	db.insert(photos)
		.values({ id: randomUUID(), personId, filename, isPrimary: !hasPrimary })
		.run();
}

export async function deletePhoto(photoId: string) {
	const p = db.select().from(photos).where(eq(photos.id, photoId)).get();
	if (!p) return;
	db.delete(photos).where(eq(photos.id, photoId)).run();
	await deleteUpload(p.filename);
	// If we removed the primary, promote another photo for that person.
	if (p.isPrimary) {
		const next = db.select().from(photos).where(eq(photos.personId, p.personId)).get();
		if (next) db.update(photos).set({ isPrimary: true }).where(eq(photos.id, next.id)).run();
	}
}

export function setPrimaryPhoto(photoId: string) {
	const p = db.select().from(photos).where(eq(photos.id, photoId)).get();
	if (!p) return;
	db.update(photos).set({ isPrimary: false }).where(eq(photos.personId, p.personId)).run();
	db.update(photos).set({ isPrimary: true }).where(eq(photos.id, photoId)).run();
}

export function getPhoto(photoId: string) {
	return db.select().from(photos).where(eq(photos.id, photoId)).get();
}
