import { error } from '@sveltejs/kit';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { extname } from 'node:path';
import { getPhoto } from '$lib/server/people';
import { uploadPath } from '$lib/server/uploads';
import type { RequestHandler } from './$types';

const TYPES: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.gif': 'image/gif'
};

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const photo = getPhoto(params.id);
	if (!photo) throw error(404, 'Not found');

	const path = uploadPath(photo.filename);
	if (!path) throw error(404, 'Not found');

	const stream = Readable.toWeb(createReadStream(path)) as ReadableStream;
	return new Response(stream, {
		headers: {
			'content-type': TYPES[extname(photo.filename).toLowerCase()] ?? 'application/octet-stream',
			'cache-control': 'private, max-age=86400'
		}
	});
};
