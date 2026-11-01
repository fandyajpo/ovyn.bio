// See: https://svelte.dev/docs/kit/types#app.d.ts

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** Managed Better Auth session user (null when signed out). */
			user: {
				id: string;
				name: string;
				email: string | null;
				image: string | null;
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
