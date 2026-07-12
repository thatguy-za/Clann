import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Self-hosted deploy: adapter-node builds a standalone server into build/, run with `node build`.
			adapter: adapter()
		})
	],
	// relatives-tree ships ESM with extensionless internal imports that Node's
	// strict resolver rejects; let Vite bundle it for SSR so they resolve.
	ssr: {
		noExternal: ['relatives-tree']
	}
});
