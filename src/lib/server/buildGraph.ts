import { eq } from 'drizzle-orm';
import { db } from './db';
import { people, relationships, photos } from './schema';

// Mirrors relatives-tree's Node shape using plain string unions so the graph
// is JSON-serializable across the load boundary. calcTree() runs on the client.
export type RelKind = 'blood' | 'married' | 'divorced' | 'adopted' | 'half';
export type NodeRelation = { id: string; type: RelKind };
export type TreeNode = {
	id: string;
	gender: 'male' | 'female';
	parents: NodeRelation[];
	children: NodeRelation[];
	siblings: NodeRelation[];
	spouses: NodeRelation[];
};

export type PersonSummary = {
	id: string;
	givenName: string;
	familyName: string | null;
	sex: 'male' | 'female';
	birthDate: string | null;
	deathDate: string | null;
	primaryPhotoId: string | null;
};

export type TreeData = {
	nodes: TreeNode[];
	index: Record<string, PersonSummary>;
	defaultRootId: string | null;
};

export function buildTree(): TreeData {
	const ppl = db.select().from(people).all();
	const rels = db.select().from(relationships).all();
	const primaries = db.select().from(photos).where(eq(photos.isPrimary, true)).all();

	const primaryByPerson = new Map<string, string>();
	for (const p of primaries) primaryByPerson.set(p.personId, p.id);

	// parent -> [{child, kind}], child -> [{parent, kind}], id -> [{spouse, kind}]
	const childrenOf = new Map<string, NodeRelation[]>();
	const parentsOf = new Map<string, NodeRelation[]>();
	const spousesOf = new Map<string, NodeRelation[]>();
	const push = (m: Map<string, NodeRelation[]>, key: string, rel: NodeRelation) => {
		const arr = m.get(key);
		if (arr) arr.push(rel);
		else m.set(key, [rel]);
	};

	for (const r of rels) {
		const kind = r.kind as RelKind;
		if (r.type === 'parent-child') {
			push(childrenOf, r.fromId, { id: r.toId, type: kind });
			push(parentsOf, r.toId, { id: r.fromId, type: kind });
		} else {
			push(spousesOf, r.fromId, { id: r.toId, type: kind });
			push(spousesOf, r.toId, { id: r.fromId, type: kind });
		}
	}

	const nodes: TreeNode[] = [];
	const index: Record<string, PersonSummary> = {};

	for (const p of ppl) {
		const parents = parentsOf.get(p.id) ?? [];
		const parentIds = new Set(parents.map((x) => x.id));

		// Siblings: everyone who shares at least one parent. Full siblings
		// (share 2+ parents) are 'blood'; otherwise 'half'.
		const sharedCount = new Map<string, number>();
		for (const parent of parentIds) {
			for (const child of childrenOf.get(parent) ?? []) {
				if (child.id === p.id) continue;
				sharedCount.set(child.id, (sharedCount.get(child.id) ?? 0) + 1);
			}
		}
		const siblings: NodeRelation[] = [...sharedCount.entries()].map(([id, n]) => ({
			id,
			type: n >= 2 ? 'blood' : 'half'
		}));

		nodes.push({
			id: p.id,
			gender: p.sex,
			parents,
			children: childrenOf.get(p.id) ?? [],
			siblings,
			spouses: spousesOf.get(p.id) ?? []
		});

		index[p.id] = {
			id: p.id,
			givenName: p.givenName,
			familyName: p.familyName,
			sex: p.sex,
			birthDate: p.birthDate,
			deathDate: p.deathDate,
			primaryPhotoId: primaryByPerson.get(p.id) ?? null
		};
	}

	// Default root: prefer an ancestor (no parents), earliest birth; else first.
	const roots = ppl.filter((p) => !(parentsOf.get(p.id)?.length));
	const pool = roots.length ? roots : ppl;
	const sorted = [...pool].sort((a, b) => (a.birthDate ?? '9999').localeCompare(b.birthDate ?? '9999'));
	const defaultRootId = sorted[0]?.id ?? null;

	return { nodes, index, defaultRootId };
}
