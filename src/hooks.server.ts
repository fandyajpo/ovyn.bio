import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/env';
import type { Handle } from '@sveltejs/kit/hooks';
import { auth } from '#lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.user = {
			id: session.user.id,
			name: session.user.name,
			email: session.user.email ?? null,
			image: session.user.image ?? null
		};
	} else {
		event.locals.user = null;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};
