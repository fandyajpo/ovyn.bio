import type { Handle } from '@sveltejs/kit/hooks';
import { auth } from '#lib/server/auth';
import { recordReferral } from '#lib/server/services/engagement';

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

		const referralCode = event.cookies.get('ovyn_referral');
		if (referralCode) {
			try {
				await recordReferral(session.user.id, referralCode);
				event.cookies.delete('ovyn_referral', { path: '/' });
			} catch (err) {
				// Keep the cookie for the next request if the database is temporarily unavailable.
				console.error('Referral attribution failed', err);
			}
		}
	} else {
		event.locals.user = null;
	}

	return resolve(event);
};
