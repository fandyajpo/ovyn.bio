import { auth } from '#lib/server/auth';

/**
 * Better Auth catch-all: every /api/auth/* request is passed straight to
 * the auth handler, which handles sign-in, callback, session, etc.
 * Mounted as a real route so it never depends on origin checks.
 */
const handler = (event: { request: Request }) => auth.handler(event.request);

export const GET = handler;
export const POST = handler;
