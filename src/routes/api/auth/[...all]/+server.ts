import { auth } from '#lib/server/auth';
import { getFeatureFlags } from '#lib/server/services/settings';

function isDisabled(message: string): Response {
	return Response.json({ message, code: 'SIGN_IN_DISABLED' }, { status: 403 });
}

/**
 * Standalone Better Auth catch-all: every /api/auth/* request is passed
 * to the auth handler, which handles configured social sign-in providers, OAuth
 * callbacks, session reads/writes, and sign-out.
 *
 * The admin "Manage auth" toggles are enforced here — the only door sign-in
 * traffic walks through. The login page also hides disabled buttons, but the
 * server decides; a stale client or a direct API call cannot bypass a toggle.
 */
const handler = async (event: { request: Request; url: URL }) => {
	const flags = await getFeatureFlags();
	const path = event.url.pathname.replace(/^\/api\/auth\/?/, '').replace(/\/+$/, '');
	const method = event.request.method.toUpperCase();

	if (!flags['auth.credentialLogin'] && method === 'POST' && (path === 'sign-in/email' || path === 'sign-up/email')) {
		return isDisabled('Email and username sign-in is disabled right now.');
	}

	// Kill both ends of the reset flow: requesting a link and spending one.
	if (
		!flags['auth.forgotPassword'] &&
		((method === 'POST' && (path === 'request-password-reset' || path === 'reset-password')) ||
			(method === 'GET' && path.startsWith('reset-password/')))
	) {
		return isDisabled('Password reset is disabled right now.');
	}

	if (method === 'POST' && path === 'sign-in/social' && (!flags['auth.google'] || !flags['auth.discord'])) {
		try {
			const body = (await event.request.clone().json()) as { provider?: string };
			const provider = String(body.provider ?? '').toLowerCase();
			if (provider === 'google' && !flags['auth.google']) {
				return isDisabled('Google sign-in is disabled right now.');
			}
			if (provider === 'discord' && !flags['auth.discord']) {
				return isDisabled('Discord sign-in is disabled right now.');
			}
		} catch {
			// Unreadable body: let better-auth answer with its own validation error.
		}
	}

	// Block mid-flow callbacks too, so a toggle also closes an OAuth round
	// that was started before it.
	if (method === 'GET' && path === 'callback/google' && !flags['auth.google']) {
		return isDisabled('Google sign-in is disabled right now.');
	}
	if (method === 'GET' && path === 'callback/discord' && !flags['auth.discord']) {
		return isDisabled('Discord sign-in is disabled right now.');
	}

	return auth.handler(event.request);
};

export const GET = handler;
export const POST = handler;