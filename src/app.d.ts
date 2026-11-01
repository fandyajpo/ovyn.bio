// See: https://svelte.dev/docs/kit/types#app.d.ts
import type { User } from 'better-auth';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** Better Auth session user (null when signed out). */
			user: Pick<User, 'id' | 'name' | 'email' | 'image'> | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
