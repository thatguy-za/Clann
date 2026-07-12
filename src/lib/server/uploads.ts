import { randomUUID } from 'node:crypto';
import { mkdirSync, createWriteStream, existsSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { env } from '$env/dynamic/private';

const UPLOAD_DIR = env.UPLOAD_DIR ?? 'data/uploads';
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = new Map([
	['image/jpeg', '.jpg'],
	['image/png', '.png'],
	['image/webp', '.webp'],
	['image/gif', '.gif']
]);

mkdirSync(UPLOAD_DIR, { recursive: true });

export class UploadError extends Error {}

/** Persist an uploaded image and return its stored filename. */
export async function saveUpload(file: File): Promise<string> {
	if (!ALLOWED.has(file.type)) {
		throw new UploadError('Only JPEG, PNG, WebP or GIF images are allowed.');
	}
	if (file.size === 0) throw new UploadError('The uploaded file is empty.');
	if (file.size > MAX_BYTES) throw new UploadError('Image must be 8 MB or smaller.');

	const ext = ALLOWED.get(file.type) ?? extname(file.name) ?? '';
	const filename = `${randomUUID()}${ext}`;
	const dest = join(UPLOAD_DIR, filename);

	// Stream to disk to avoid buffering the whole file in memory.
	const nodeStream = Readable.fromWeb(file.stream() as never);
	await pipeline(nodeStream, createWriteStream(dest));
	return filename;
}

export function uploadPath(filename: string): string | null {
	// Guard against path traversal — filenames are UUID-based, no separators.
	if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) return null;
	const p = join(UPLOAD_DIR, filename);
	return existsSync(p) ? p : null;
}

export async function deleteUpload(filename: string): Promise<void> {
	const p = uploadPath(filename);
	if (p) await unlink(p).catch(() => {});
}
