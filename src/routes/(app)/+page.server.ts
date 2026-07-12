import { buildTree } from '$lib/server/buildGraph';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { tree: buildTree() };
};
