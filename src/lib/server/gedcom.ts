// Minimal GEDCOM 5.5.x parser — enough to import individuals and the
// family links Clann models: parent-child and spouse relationships.
//
// GEDCOM is a line-based hierarchical format:
//   0 @I1@ INDI
//   1 NAME John /Smith/
//   1 SEX M
//   1 BIRT
//   2 DATE 11 JUL 1992
//   0 @F1@ FAM
//   1 HUSB @I1@
//   1 WIFE @I2@
//   1 CHIL @I3@

export type GedcomPerson = {
	xref: string;
	givenName: string;
	familyName: string | null;
	sex: 'male' | 'female';
	birthDate: string | null;
	deathDate: string | null;
};

export type GedcomImport = {
	people: GedcomPerson[];
	/** [parentXref, childXref] pairs */
	parentChild: [string, string][];
	/** [spouseAXref, spouseBXref] pairs */
	spouses: [string, string][];
};

const MONTHS: Record<string, string> = {
	JAN: '01',
	FEB: '02',
	MAR: '03',
	APR: '04',
	MAY: '05',
	JUN: '06',
	JUL: '07',
	AUG: '08',
	SEP: '09',
	OCT: '10',
	NOV: '11',
	DEC: '12'
};

// Convert a GEDCOM date to YYYY/MM/DD when it's a full "DD MON YYYY" date so
// the tree can format it nicely. Anything else (partial or approximate, e.g.
// "ABT 1850", "1850", "JUL 1990") is kept verbatim — Clann stores dates as
// free text.
function convertDate(value: string): string | null {
	const t = value.trim();
	if (!t) return null;
	const m = t.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
	if (m) {
		const mon = MONTHS[m[2].toUpperCase()];
		if (mon) return `${m[3]}/${mon}/${m[1].padStart(2, '0')}`;
	}
	return t;
}

function pointer(value: string): string | null {
	const m = value.trim().match(/^@([^@]+)@$/);
	return m ? `@${m[1]}@` : null;
}

// "John /Smith/ Jr" -> given "John Jr", surname "Smith"
function parseName(value: string): { given: string; surname: string | null } {
	const slash = value.match(/^(.*?)\/([^/]*)\/(.*)$/);
	if (slash) {
		const given = `${slash[1].trim()} ${slash[3].trim()}`.trim();
		const surname = slash[2].trim();
		return { given, surname: surname || null };
	}
	return { given: value.trim(), surname: null };
}

type ParsedLine = { level: number; xref: string | null; tag: string; value: string };

function parseLine(line: string): ParsedLine | null {
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
	const tag = sp === -1 ? rest : rest.slice(0, sp);
	const value = sp === -1 ? '' : rest.slice(sp + 1);
	return { level, xref, tag: tag.toUpperCase(), value };
}

export function parseGedcom(text: string): GedcomImport {
	const lines = text.split(/\r?\n/);

	const peopleByXref = new Map<string, GedcomPerson>();
	const parentChild: [string, string][] = [];
	const spouses: [string, string][] = [];

	type Fam = { husb: string | null; wife: string | null; chil: string[] };

	let indi: GedcomPerson | null = null;
	let fam: Fam | null = null;
	let eventContext: 'BIRT' | 'DEAT' | null = null;

	const finishFam = (f: Fam | null) => {
		if (!f) return;
		const parents = [f.husb, f.wife].filter((x): x is string => !!x);
		if (f.husb && f.wife) spouses.push([f.husb, f.wife]);
		for (const child of f.chil) {
			for (const parent of parents) parentChild.push([parent, child]);
		}
	};

	for (const raw of lines) {
		if (!raw.trim()) continue;
		const parsed = parseLine(raw);
		if (!parsed) continue;
		const { level, xref, tag, value } = parsed;

		if (level === 0) {
			finishFam(fam);
			indi = null;
			fam = null;
			eventContext = null;
			if (tag === 'INDI' && xref) {
				indi = {
					xref,
					givenName: '',
					familyName: null,
					sex: 'male',
					birthDate: null,
					deathDate: null
				};
				peopleByXref.set(xref, indi);
			} else if (tag === 'FAM' && xref) {
				fam = { husb: null, wife: null, chil: [] };
			}
			continue;
		}

		if (indi) {
			if (level === 1) {
				eventContext = null;
				if (tag === 'NAME') {
					const { given, surname } = parseName(value);
					if (given) indi.givenName = given;
					if (surname) indi.familyName = surname;
				} else if (tag === 'GIVN' && !indi.givenName) {
					indi.givenName = value.trim();
				} else if (tag === 'SURN' && !indi.familyName) {
					indi.familyName = value.trim() || null;
				} else if (tag === 'SEX') {
					indi.sex = value.trim().toUpperCase().startsWith('F') ? 'female' : 'male';
				} else if (tag === 'BIRT') {
					eventContext = 'BIRT';
				} else if (tag === 'DEAT') {
					eventContext = 'DEAT';
				}
			} else if (level === 2 && tag === 'DATE') {
				if (eventContext === 'BIRT') indi.birthDate = convertDate(value);
				else if (eventContext === 'DEAT') indi.deathDate = convertDate(value);
			}
		} else if (fam && level === 1) {
			if (tag === 'HUSB') fam.husb = pointer(value);
			else if (tag === 'WIFE') fam.wife = pointer(value);
			else if (tag === 'CHIL') {
				const c = pointer(value);
				if (c) fam.chil.push(c);
			}
		}
	}
	finishFam(fam);

	// Drop relationship links that point at individuals we never saw.
	const known = (x: string) => peopleByXref.has(x);
	return {
		people: [...peopleByXref.values()],
		parentChild: parentChild.filter(([p, c]) => known(p) && known(c)),
		spouses: spouses.filter(([a, b]) => known(a) && known(b))
	};
}
