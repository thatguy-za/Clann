const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

/**
 * Format a stored free-text date for display. A full YYYY/MM/DD or YYYY-MM-DD
 * value becomes "DD Month YYYY" (e.g. "11 July 1992"). Any other value —
 * partial or approximate genealogical dates like "1850" or "abt 1850" — is
 * returned unchanged, so nothing is lost.
 */
export function formatDisplayDate(value: string | null | undefined): string {
	if (!value) return '';
	const trimmed = value.trim();
	const match = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
	if (match) {
		const year = Number(match[1]);
		const month = Number(match[2]);
		const day = Number(match[3]);
		if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
			return `${day} ${MONTHS[month - 1]} ${year}`;
		}
	}
	return trimmed;
}
