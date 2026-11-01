import type { Handle } from '@sveltejs/kit/hooks';
import { auth } from '#lib/server/auth';

// Better Auth requests are handled by /api/auth/[...all]/+server.ts.
// This hook only needs to populate session data for load functions,
// form actions, and API endpoints.
export const handle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.user = session.user;
		event.locals.session = session.session;
	} else {
		event.locals.user = null;
		event.locals.session = null;
	}

	return resolve(event);
};
