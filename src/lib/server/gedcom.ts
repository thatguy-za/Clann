// Minimal GEDCOM 5.5.x parser. Builds a record tree from the line-based
// format, then extracts the pieces Clann stores: individuals (name, sex,
// birth/death, occupation, notes/bio, life events, embedded photos) and the
// family links (parent-child and spouse).

export type GedcomEvent = {
	type: string;
	date: string | null;
	place: string | null;
	description: string | null;
};

// Only embedded images (data: URIs / base64) can be imported from a lone .ged
// file — external file paths and URLs reference data we don't have.
export type GedcomMedia = { mime: string; base64: string };

export type GedcomPerson = {
	xref: string;
	givenName: string;
	familyName: string | null;
	sex: 'male' | 'female' | null;
	birthDate: string | null;
	deathDate: string | null;
	occupation: string | null;
	bio: string | null;
	events: GedcomEvent[];
	photos: GedcomMedia[];
};

export type GedcomImport = {
	people: GedcomPerson[];
	/** [parentXref, childXref] pairs */
	parentChild: [string, string][];
	/** [spouseAXref, spouseBXref] pairs */
	spouses: [string, string][];
};

const MONTHS: Record<string, string> = {
	JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
	JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
};

// Common INDI event/fact tags -> human-readable labels. BIRT/DEAT are handled
// separately (they set the person's birth/death dates), and OCCU maps to the
// occupation field.
const EVENT_LABELS: Record<string, string> = {
	BAPM: 'Baptism', CHR: 'Christening', BLES: 'Blessing', BURI: 'Burial',
	CREM: 'Cremation', ADOP: 'Adoption', CONF: 'Confirmation', FCOM: 'First communion',
	ORDN: 'Ordination', NATU: 'Naturalization', EMIG: 'Emigration', IMMI: 'Immigration',
	CENS: 'Census', PROB: 'Probate', WILL: 'Will', GRAD: 'Graduation', RETI: 'Retirement',
	RESI: 'Residence', EDUC: 'Education', RELI: 'Religion', MARR: 'Marriage',
	DIV: 'Divorce', EVEN: 'Event', TITL: 'Title'
};

function yearIn(s: string): string | null {
	const m = s.match(/\d{4}/);
	return m ? m[0] : null;
}

// Convert a GEDCOM date to a clean stored value:
//   - "11 JUL 1992"            -> "1992/07/11"  (tree renders "11 July 1992")
//   - "ABT/EST/CAL/CIRCA 1825" -> "c. 1825"
//   - "BET 1883 AND 1884"      -> "1883–1884"
//   - "BEF/AFT 1900"           -> "before 1900" / "after 1900"
//   - bare year / anything else -> kept verbatim
function convertDate(value: string): string | null {
	const t = value.trim();
	if (!t) return null;
	const up = t.toUpperCase();

	// Range: BET x AND y
	let m = up.match(/^BET(?:WEEN)?\s+(.+?)\s+AND\s+(.+)$/);
	if (m) {
		const y1 = yearIn(m[1]);
		const y2 = yearIn(m[2]);
		if (y1 && y2) return y1 === y2 ? `c. ${y1}` : `${y1}–${y2}`;
	}
	// Approximate / estimated / calculated
	m = up.match(/^(?:ABT|ABOUT|EST|ESTIMATED|CAL|CIRCA)\.?\s+(.+)$/);
	if (m) {
		const y = yearIn(m[1]);
		if (y) return `c. ${y}`;
	}
	// Before / after
	m = up.match(/^(?:BEF|BEFORE)\s+(.+)$/);
	if (m) {
		const y = yearIn(m[1]);
		if (y) return `before ${y}`;
	}
	m = up.match(/^(?:AFT|AFTER)\s+(.+)$/);
	if (m) {
		const y = yearIn(m[1]);
		if (y) return `after ${y}`;
	}
	// Exact "DD MON YYYY"
	m = t.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
	if (m) {
		const mon = MONTHS[m[2].toUpperCase()];
		if (mon) return `${m[3]}/${mon}/${m[1].padStart(2, '0')}`;
	}
	// Freeform containing an approximate marker (e.g. "23 June about 1880")
	if (/\b(ABOUT|ABT|CIRCA|EST)\b/.test(up)) {
		const y = yearIn(t);
		if (y) return `c. ${y}`;
	}
	return t;
}

function pointer(value: string): string | null {
	const m = value.trim().match(/^@([^@]+)@$/);
	return m ? `@${m[1]}@` : null;
}

// A leading parenthetical on a name is a role/title/note crammed into the
// NAME field (e.g. "(Research Officer) Oliver /West/", "(Twin) Kathleen
// /Lyons/"). Pull it off the front so the name is clean; the caller stores it
// separately. Mid-name parentheticals (nicknames like "Catherine (Kate)") are
// left alone.
function extractLeadingPrefix(given: string): { prefix: string | null; given: string } {
	const m = given.match(/^\(([^)]+)\)\s*(.*)$/);
	if (m && m[2].trim()) return { prefix: m[1].trim(), given: m[2].trim() };
	return { prefix: null, given };
}

function parseName(value: string): { given: string; surname: string | null } {
	const slash = value.match(/^(.*?)\/([^/]*)\/(.*)$/);
	if (slash) {
		const given = `${slash[1].trim()} ${slash[3].trim()}`.trim();
		const surname = slash[2].trim();
		return { given, surname: surname || null };
	}
	return { given: value.trim(), surname: null };
}

// Some exporters store rich-text notes as HTML. Reduce it to plain text so
// the bio doesn't show literal "<p style=...>" markup.
function htmlToText(s: string): string {
	return s
		.replace(/<\s*br\s*\/?>/gi, '\n')
		.replace(/<\/\s*(p|div|li)\s*>/gi, '\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&quot;/gi, '"')
		.replace(/&#0?39;|&apos;/gi, "'")
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

function parseDataUri(value: string): GedcomMedia | null {
	const m = value.trim().match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
	return m ? { mime: m[1].toLowerCase(), base64: m[2].replace(/\s+/g, '') } : null;
}

// --- Record tree --------------------------------------------------------

type Node = { tag: string; xref: string | null; value: string; children: Node[] };

function parseLine(line: string): { level: number; xref: string | null; tag: string; value: string } | null {
	const m = line.match(/^\s*(\d+)\s+(.*)$/);
	if (!m) return null;
	const level = Number(m[1]);
	let rest = m[2];
	let xref: string | null = null;
	const xm = rest.match(/^(@[^@]+@)\s+(.*)$/);
	if (xm) {
		xref = xm[1];
		rest = xm[2];
	}
	const sp = rest.indexOf(' ');
	const tag = (sp === -1 ? rest : rest.slice(0, sp)).toUpperCase();
	const value = sp === -1 ? '' : rest.slice(sp + 1);
	return { level, xref, tag, value };
}

function buildRecords(text: string): Node[] {
	const root: Node = { tag: 'ROOT', xref: null, value: '', children: [] };
	const stack: { node: Node; level: number }[] = [{ node: root, level: -1 }];
	for (const raw of text.split(/\r?\n/)) {
		if (!raw.trim()) continue;
		const p = parseLine(raw);
		if (!p) continue;
		while (stack.length > 1 && stack[stack.length - 1].level >= p.level) stack.pop();
		const node: Node = { tag: p.tag, xref: p.xref, value: p.value, children: [] };
		stack[stack.length - 1].node.children.push(node);
		stack.push({ node, level: p.level });
	}
	return root.children;
}

const child = (n: Node, tag: string) => n.children.find((c) => c.tag === tag);
const childValue = (n: Node, tag: string) => child(n, tag)?.value.trim() || null;

// A node's value plus any CONT (newline) / CONC (concatenate) continuations.
function nodeText(n: Node): string {
	let text = n.value ?? '';
	for (const c of n.children) {
		if (c.tag === 'CONT') text += '\n' + (c.value ?? '');
		else if (c.tag === 'CONC') text += c.value ?? '';
	}
	return text.trim();
}

export function parseGedcom(text: string): GedcomImport {
	const records = buildRecords(text);

	// Resolve tables for pointer references.
	const noteRecords = new Map<string, string>();
	const mediaRecords = new Map<string, GedcomMedia | null>();
	for (const r of records) {
		if (r.xref && r.tag === 'NOTE') noteRecords.set(r.xref, nodeText(r));
		if (r.xref && r.tag === 'OBJE') mediaRecords.set(r.xref, mediaFromObje(r, null));
	}

	function resolveNote(n: Node): string {
		const ptr = pointer(n.value);
		return htmlToText(ptr ? (noteRecords.get(ptr) ?? '') : nodeText(n));
	}

	function mediaFromObjeResolved(n: Node): GedcomMedia | null {
		const ptr = pointer(n.value);
		if (ptr) return mediaRecords.get(ptr) ?? null;
		return mediaFromObje(n, null);
	}

	const people: GedcomPerson[] = [];
	const byXref = new Set<string>();
	const parentChild: [string, string][] = [];
	const spouses: [string, string][] = [];

	for (const rec of records) {
		if (rec.tag === 'INDI' && rec.xref) {
			people.push(parseIndividual(rec, resolveNote, mediaFromObjeResolved));
			byXref.add(rec.xref);
		} else if (rec.tag === 'FAM') {
			const husb = childValue(rec, 'HUSB');
			const wife = childValue(rec, 'WIFE');
			const parents = [husb, wife].map((v) => (v ? pointer(v) : null)).filter((x): x is string => !!x);
			if (parents.length === 2) spouses.push([parents[0], parents[1]]);
			for (const c of rec.children.filter((c) => c.tag === 'CHIL')) {
				const cp = pointer(c.value);
				if (cp) for (const p of parents) parentChild.push([p, cp]);
			}
		}
	}

	const known = (x: string) => byXref.has(x);
	return {
		people,
		parentChild: parentChild.filter(([p, c]) => known(p) && known(c)),
		spouses: spouses.filter(([a, b]) => known(a) && known(b))
	};
}

function mediaFromObje(n: Node, _unused: null): GedcomMedia | null {
	// GEDCOM 5.5.1: 1 OBJE / 2 FILE <data-uri>. Also accept a data URI directly.
	const file = child(n, 'FILE');
	const candidate = file?.value ?? n.value ?? '';
	return parseDataUri(candidate);
}

function parseIndividual(
	rec: Node,
	resolveNote: (n: Node) => string,
	resolveMedia: (n: Node) => GedcomMedia | null
): GedcomPerson {
	const person: GedcomPerson = {
		xref: rec.xref as string,
		givenName: '',
		familyName: null,
		sex: null,
		birthDate: null,
		deathDate: null,
		occupation: null,
		bio: null,
		events: [],
		photos: []
	};

	const notes: string[] = [];

	for (const node of rec.children) {
		const tag = node.tag;
		if (tag === 'NAME') {
			const { given, surname } = parseName(node.value);
			if (given && !person.givenName) person.givenName = given;
			if (surname && !person.familyName) person.familyName = surname;
			// NAME may carry GIVN/SURN subtags instead of the slash form.
			const givn = childValue(node, 'GIVN');
			const surn = childValue(node, 'SURN');
			if (givn && !person.givenName) person.givenName = givn;
			if (surn && !person.familyName) person.familyName = surn;
		} else if (tag === 'SEX') {
			const s = node.value.trim().toUpperCase();
			person.sex = s === 'M' ? 'male' : s === 'F' ? 'female' : null;
		} else if (tag === 'BIRT') {
			person.birthDate = childValue(node, 'DATE') ? convertDate(childValue(node, 'DATE') as string) : person.birthDate;
		} else if (tag === 'DEAT') {
			person.deathDate = childValue(node, 'DATE') ? convertDate(childValue(node, 'DATE') as string) : person.deathDate;
		} else if (tag === 'OCCU') {
			if (node.value.trim()) person.occupation = node.value.trim();
		} else if (tag === 'NOTE') {
			const t = resolveNote(node);
			if (t) notes.push(t);
		} else if (tag === 'OBJE') {
			const media = resolveMedia(node);
			if (media) person.photos.push(media);
		} else if (EVENT_LABELS[tag]) {
			const dateRaw = childValue(node, 'DATE');
			const place = childValue(node, 'PLAC');
			const noteNode = child(node, 'NOTE');
			const description = (noteNode ? resolveNote(noteNode) : null) || childValue(node, 'TYPE') || null;
			if (dateRaw || place || description) {
				person.events.push({
					type: EVENT_LABELS[tag],
					date: dateRaw ? convertDate(dateRaw) : null,
					place,
					description
				});
			}
		}
	}

	if (notes.length) person.bio = notes.join('\n\n');

	// Separate a leading "(role/title)" prefix from the name and store it apart.
	// Job/title prefixes go to the occupation field; birth descriptors like
	// "Twin" (not an occupation) and anything that would overwrite an existing
	// occupation go to notes instead.
	const { prefix, given } = extractLeadingPrefix(person.givenName);
	if (prefix) {
		person.givenName = given;
		const isDescriptor = /^twins?$/i.test(prefix);
		const duplicatesOccupation = person.occupation?.toLowerCase() === prefix.toLowerCase();
		if (!isDescriptor && !person.occupation) {
			person.occupation = prefix;
		} else if (!duplicatesOccupation) {
			person.bio = person.bio ? `${prefix}\n\n${person.bio}` : prefix;
		}
	}

	return person;
}
