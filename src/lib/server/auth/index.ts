import {
	createAuthServer,
	handleAuthProxyRequest,
	type RequestContext,
	type CookieOptions
} from '@neon/auth/server';
import type { RequestEvent } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';

/**
 * SvelteKit adapter for Neon's Managed Better Auth, built on the
 * framework-agnostic `@neon/auth/server` toolkit (see the upstream
 * BUILDING-AN-ADAPTER.md — this mirrors the Next.js reference adapter).
 *
 * Three pieces:
 *  1. RequestContext — bridges SvelteKit's cookies/headers to the toolkit
 *  2. `auth` server instance — getSession() etc., request-scoped via
 *     SvelteKit's getRequestEvent()
 *  3. `auth.handler()` — the /api/auth/[...all] proxy that keeps auth
 *     cookies first-party and finalizes OAuth callbacks
 */

function createRequestContext(event: RequestEvent): RequestContext {
	return {
		getCookies: () => event.request.headers.get('cookie') ?? '',
		setCookie: (name: string, value: string, options: CookieOptions) => {
			event.cookies.set(name, value, {
				path: options.path ?? '/',
				httpOnly: options.httpOnly,
				secure: options.secure,
				sameSite: options.sameSite,
				domain: options.domain,
				maxAge: options.maxAge,
				expires: options.expires
			});
		},
		getHeader: (name: string) => event.request.headers.get(name),
		getOrigin: () => event.request.headers.get('origin') ?? event.url.origin,
		getFramework: () => 'sveltekit'
	};
}

export interface CreateNeonAuthOptions {
	/** Managed Better Auth base URL, e.g. https://ep-xxx.neonauth...aws.neon.tech/neondb/auth */
	baseUrl: string;
	/** Secret for signing the session_data cookie (min 32 chars). */
	cookieSecret: string;
	sessionDataTtl?: number;
	domain?: string;
}

export function createNeonAuth(options: CreateNeonAuthOptions) {
	const config = {
		baseUrl: options.baseUrl,
		cookieSecret: options.cookieSecret,
		sessionDataTtl: options.sessionDataTtl,
		domain: options.domain
	};

	// Server methods (getSession etc.) resolve the current request through
	// SvelteKit's request-scoped event.
	const server = createAuthServer({
		baseUrl: config.baseUrl,
		cookieSecret: config.cookieSecret,
		sessionDataTtl: config.sessionDataTtl,
		domain: config.domain,
		context: () => createRequestContext(getRequestEvent())
	});

	/** Catch-all handler for /api/auth/* — proxies upstream with cookie
	 *  sanitization and OAuth callback finalization. */
	const handler = async (event: RequestEvent) => {
		const { pathname } = new URL(event.request.url);
		const path = pathname.replace(/^\/api\/auth\//, '');

		return handleAuthProxyRequest({
			request: event.request,
			path,
			baseUrl: config.baseUrl,
			cookieSecret: config.cookieSecret,
			sessionDataTtl: config.sessionDataTtl,
			domain: config.domain
		});
	};

	return Object.assign(server, { handler });
}

// ---------------------------------------------------------------------------
// App-level env access (server-only). Declared in src/env.ts.
// ---------------------------------------------------------------------------

import { NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET } from '$app/env/private';

function requireEnv(name: string, value: string | undefined): string {
	if (!value) {
		throw new Error(`${name} must be set`);
	}
	return value;
}

/**
 * The shared Neon Auth instance for the whole app.
 * Throws at import time when configuration is missing — fail fast, loudly.
 */
export const auth = createNeonAuth({
	baseUrl: requireEnv('NEON_AUTH_BASE_URL', NEON_AUTH_BASE_URL),
	cookieSecret: requireEnv('NEON_AUTH_COOKIE_SECRET', NEON_AUTH_COOKIE_SECRET)
});
