import type { Handle } from '@sveltejs/kit/hooks';
import { auth } from '#lib/server/auth';

// Auth requests are handled by the /api/auth/[...all]/+server.ts route.
// This hook populates session data for load functions, form actions, and
// API endpoints.
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

	return resolve(event);
};
