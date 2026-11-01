import type { Handle } from '@sveltejs/kit/hooks';
import { auth } from '#lib/server/auth';
import { provisionUser } from '#lib/server/services/profiles';

// Better Auth requests are handled by /api/auth/[...all]/+server.ts.
// This hook only populates session data for load functions, form actions,
// and API endpoints — and lazily provisions the OVYN profile.
export const handle: Handle = async ({ event, resolve }) => {
	const { data: session } = await auth.getSession();

	if (session?.user) {
		event.locals.user = {
			id: session.user.id,
			name: session.user.name,
			email: session.user.email ?? null,
			image: session.user.image ?? null
		};

		try {
			await provisionUser(session.user.id);
		} catch (err) {
			// Never block requests on provisioning failures.
			console.error('provisionUser failed', err);
		}
	} else {
		event.locals.user = null;
	}

	return resolve(event);
};
