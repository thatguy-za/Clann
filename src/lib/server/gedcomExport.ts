import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { db } from './db';
import { people, relationships, photos, lifeEvents } from './schema';
import { uploadPath } from './uploads';
import { EVENT_LABELS } from './gedcom';

// Reverse of the import date normaliser, back to GEDCOM date form:
//   "1992/07/11"  -> "11 JUL 1992"
//   "c. 1825"     -> "ABT 1825"
//   "1883–1884"   -> "BET 1883 AND 1884"
//   "before 1900" -> "BEF 1900" / "after 1900" -> "AFT 1900"
//   anything else -> as-is
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function toGedcomDate(value: string | null): string | null {
	if (!value) return null;
	const t = value.trim();
	let m = t.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
	if (m) {
		const mon = MONTHS[Number(m[2]) - 1];
		if (mon) return `${Number(m[3])} ${mon} ${m[1]}`;
	}
	m = t.match(/^c\.\s*(\d{4})$/i);
	if (m) return `ABT ${m[1]}`;
	m = t.match(/^(\d{4})[–-](\d{4})$/);
	if (m) return `BET ${m[1]} AND ${m[2]}`;
	m = t.match(/^before\s+(\d{4})$/i);
	if (m) return `BEF ${m[1]}`;
	m = t.match(/^after\s+(\d{4})$/i);
	if (m) return `AFT ${m[1]}`;
	return t;
}

const MIME_BY_EXT: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.gif': 'image/gif'
};

// GEDCOM escaping: strip stray CR, and double a leading '@' in text values —
// but leave real pointers (@I5@, @F2@) untouched.
function esc(value: string): string {
	const v = value.replace(/\r/g, '');
	if (/^@[^@]+@$/.test(v)) return v;
	return v.replace(/^@/, '@@');
}

const REVERSE_EVENT = new Map<string, string>(
	Object.entries(EVENT_LABELS).map(([tag, label]) => [label.toLowerCase(), tag])
);

type Fam = {
	xref: string;
	parents: string[];
	children: string[];
	marrDate: string | null;
	marrPlace: string | null;
	divorced: boolean;
};

/**
 * Serialize the whole tree to a GEDCOM 5.5.1 string. Photos are embedded as
 * base64 data: URIs in the OBJE FILE (so the single file is self-contained and
 * round-trips back through Clann's importer).
 */
export async function exportGedcom(now: Date): Promise<string> {
	const ppl = db.select().from(people).all();
	const rels = db.select().from(relationships).all();
	const allPhotos = db.select().from(photos).all();
	const allEvents = db.select().from(lifeEvents).all();

	const personById = new Map(ppl.map((p) => [p.id, p]));
	const indiXref = new Map<string, string>();
	ppl.forEach((p, i) => indiXref.set(p.id, `@I${i + 1}@`));

	// Pre-read photo files into base64 data URIs.
	const dataUriByPhoto = new Map<string, string>();
	await Promise.all(
		allPhotos.map(async (ph) => {
			const path = uploadPath(ph.filename);
			if (!path) return;
			try {
				const buf = await readFile(path);
				const mime = MIME_BY_EXT[extname(ph.filename).toLowerCase()] ?? 'image/jpeg';
				dataUriByPhoto.set(ph.id, `data:${mime};base64,${buf.toString('base64')}`);
			} catch {
				// Missing file on disk — skip it.
			}
		})
	);

	const photosByPerson = new Map<string, typeof allPhotos>();
	for (const ph of allPhotos) {
		const arr = photosByPerson.get(ph.personId) ?? [];
		arr.push(ph);
		photosByPerson.set(ph.personId, arr);
	}
	const eventsByPerson = new Map<string, typeof allEvents>();
	for (const ev of allEvents) {
		const arr = eventsByPerson.get(ev.personId) ?? [];
		arr.push(ev);
		eventsByPerson.set(ev.personId, arr);
	}

	// --- Build family records from relationship edges -----------------------
	const famByKey = new Map<string, Fam>();
	const keyOf = (ids: string[]) => [...ids].sort().join('|');
	const getFam = (parents: string[]): Fam => {
		const key = keyOf(parents);
		let fam = famByKey.get(key);
		if (!fam) {
			fam = {
				xref: '',
				parents: [...parents].sort(),
				children: [],
				marrDate: null,
				marrPlace: null,
				divorced: false
			};
			famByKey.set(key, fam);
		}
		return fam;
	};

	// Group children by their exact set of parents.
	const parentsByChild = new Map<string, string[]>();
	for (const r of rels) {
		if (r.type !== 'parent-child') continue;
		const arr = parentsByChild.get(r.toId) ?? [];
		arr.push(r.fromId);
		parentsByChild.set(r.toId, arr);
	}
	for (const [childId, parents] of parentsByChild) {
		getFam(parents).children.push(childId);
	}
	// Spouse relationships (attach marriage info; create childless families too).
	for (const r of rels) {
		if (r.type !== 'spouse') continue;
		const fam = getFam([r.fromId, r.toId]);
		fam.marrDate = r.date;
		fam.marrPlace = r.place;
		if (r.kind === 'divorced') fam.divorced = true;
	}

	const fams = [...famByKey.values()];
	fams.forEach((f, i) => (f.xref = `@F${i + 1}@`));

	const famcByPerson = new Map<string, string[]>(); // child-in family
	const famsByPerson = new Map<string, string[]>(); // spouse-in family
	for (const f of fams) {
		for (const c of f.children) (famcByPerson.get(c) ?? famcByPerson.set(c, []).get(c)!).push(f.xref);
		for (const p of f.parents) (famsByPerson.get(p) ?? famsByPerson.set(p, []).get(p)!).push(f.xref);
	}

	// --- Serialize ----------------------------------------------------------
	const out: string[] = [];
	const line = (level: number, tag: string, value?: string | null) =>
		out.push(value ? `${level} ${tag} ${esc(value)}` : `${level} ${tag}`);
	// Emit a possibly multi-line text value using CONT for newlines.
	const text = (level: number, tag: string, value: string) => {
		const parts = value.split('\n');
		line(level, tag, parts[0]);
		for (const p of parts.slice(1)) line(level + 1, 'CONT', p);
	};

	line(0, 'HEAD');
	line(1, 'SOUR', 'Clann');
	line(2, 'NAME', 'Clann');
	line(1, 'GEDC');
	line(2, 'VERS', '5.5.1');
	line(2, 'FORM', 'LINEAGE-LINKED');
	line(1, 'CHAR', 'UTF-8');
	line(1, 'DATE', `${now.getUTCDate()} ${MONTHS[now.getUTCMonth()]} ${now.getUTCFullYear()}`);

	for (const p of ppl) {
		out.push(`0 ${indiXref.get(p.id)} INDI`);
		const given = p.givenName ?? '';
		text(1, 'NAME', `${esc(given)} /${esc(p.familyName ?? '')}/`);
		if (given) line(2, 'GIVN', given);
		if (p.familyName) line(2, 'SURN', p.familyName);
		if (p.sex) line(1, 'SEX', p.sex === 'male' ? 'M' : 'F');
		if (p.birthDate) {
			line(1, 'BIRT');
			line(2, 'DATE', toGedcomDate(p.birthDate));
		}
		if (p.deathDate || p.causeOfDeath) {
			line(1, 'DEAT', p.deathDate ? undefined : 'Y');
			if (p.deathDate) line(2, 'DATE', toGedcomDate(p.deathDate));
			if (p.causeOfDeath) line(2, 'CAUS', p.causeOfDeath);
		}
		if (p.occupation) line(1, 'OCCU', p.occupation);
		// Life events.
		for (const ev of eventsByPerson.get(p.id) ?? []) {
			const tag = REVERSE_EVENT.get(ev.type.toLowerCase());
			if (tag && tag !== 'EVEN') {
				line(1, tag);
			} else {
				line(1, 'EVEN');
				line(2, 'TYPE', ev.type);
			}
			if (ev.date) line(2, 'DATE', toGedcomDate(ev.date));
			if (ev.place) line(2, 'PLAC', ev.place);
			if (ev.description) text(2, 'NOTE', ev.description);
		}
		// Alternate names + bio -> notes.
		if (p.otherNames) text(1, 'NOTE', p.otherNames);
		if (p.bio) text(1, 'NOTE', p.bio);
		// Sources.
		if (p.sources) for (const s of p.sources.split('\n').filter(Boolean)) text(1, 'SOUR', s);
		// Photos, embedded as data URIs.
		for (const ph of photosByPerson.get(p.id) ?? []) {
			const uri = dataUriByPhoto.get(ph.id);
			if (!uri) continue;
			line(1, 'OBJE');
			line(2, 'FORM', (MIME_BY_EXT[extname(ph.filename).toLowerCase()] ?? 'image/jpeg').split('/')[1]);
			line(2, 'FILE', uri);
			if (ph.isPrimary) line(2, '_PRIM', 'Y');
		}
		for (const fx of famcByPerson.get(p.id) ?? []) line(1, 'FAMC', fx);
		for (const fx of famsByPerson.get(p.id) ?? []) line(1, 'FAMS', fx);
	}

	for (const f of fams) {
		out.push(`0 ${f.xref} FAM`);
		let husb: string | null = null;
		let wife: string | null = null;
		for (const id of f.parents) {
			const s = personById.get(id)?.sex ?? null;
			if (s === 'male' && !husb) husb = id;
			else if (s === 'female' && !wife) wife = id;
			else if (!husb) husb = id;
			else if (!wife) wife = id;
		}
		if (husb) line(1, 'HUSB', indiXref.get(husb));
		if (wife) line(1, 'WIFE', indiXref.get(wife));
		for (const c of f.children) line(1, 'CHIL', indiXref.get(c));
		if (f.marrDate || f.marrPlace) {
			line(1, 'MARR');
			if (f.marrDate) line(2, 'DATE', toGedcomDate(f.marrDate));
			if (f.marrPlace) line(2, 'PLAC', f.marrPlace);
		}
		if (f.divorced) line(1, 'DIV', 'Y');
	}

	out.push('0 TRLR');
	return out.join('\n') + '\n';
}
