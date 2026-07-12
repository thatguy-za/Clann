// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { User } from '$lib/server/schema';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: Omit<User, 'passwordHash'> | null;
			session: { id: string; expiresAt: Date } | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
