import type { Handle } from '@sveltejs/kit/hooks';
import { eq } from 'drizzle-orm';
import { auth } from '#lib/server/auth';
import { db } from '#lib/server/db';
import { session as sessionTable } from '#lib/server/db/schema';
import { recordReferral } from '#lib/server/services/engagement';

// Auth requests are handled by the /api/auth/[...all]/+server.ts route.
// This hook populates session data for load functions, form actions, and
// API endpoints.
export const handle: Handle = async ({ event, resolve }) => {
	// Payment notifications carry no session, so skip the lookup for them.
	if (event.url.pathname.startsWith('/api/webhooks/')) {
		event.locals.user = null;
		return resolve(event);
	}

	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		// Suspended accounts lose access immediately: the session row is removed,
		// so every later request and auth endpoint refuses it too.
		if (session.user.status === 'suspended') {
			try {
				await db.delete(sessionTable).where(eq(sessionTable.token, session.session.token));
			} catch (err) {
				console.error('Failed to revoke a suspended session', err);
			}
			event.locals.user = null;
			return resolve(event);
		}

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