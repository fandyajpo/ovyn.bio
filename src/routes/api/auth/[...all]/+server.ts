import type { RequestHandler } from './$types';
import { auth } from '#lib/server/auth';

/**
 * Better Auth proxy: every /api/auth/* request is forwarded to Neon's
 * managed Better Auth service, with auth cookies kept first-party on our
 * origin. OAuth callbacks are finalized here too.
 */
export const POST: RequestHandler = (event) => auth.handler(event);

export const GET: RequestHandler = (event) => auth.handler(event);
