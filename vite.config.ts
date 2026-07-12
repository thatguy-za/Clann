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
			adapter: adapter(),

			// Self-hosted: the app may be reached on any host, port, or via a
			// reverse proxy, and we don't want to force users to set ORIGIN.
			// SvelteKit's default cross-origin form check compares the request
			// Origin header to the server's computed origin and returns 403 on
			// any mismatch (breaking login/setup on non-localhost URLs). Trusting
			// all origins ('*') turns that check off; we rely on SameSite=Lax
			// session cookies instead — the browser won't send the session on a
			// cross-site POST, so authenticated CSRF is still prevented.
			csrf: { trustedOrigins: ['*'] }
		})
	],
	// relatives-tree ships ESM with extensionless internal imports that Node's
	// strict resolver rejects; let Vite bundle it for SSR so they resolve.
	ssr: {
		noExternal: ['relatives-tree']
	}
});
