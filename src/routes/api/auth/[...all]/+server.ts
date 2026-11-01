import type { RequestHandler } from './$types';
import { auth } from '#lib/server/auth';

/**
 * Standalone Better Auth catch-all: every /api/auth/* request is passed
 * to the auth handler, which handles Discord sign-in, the OAuth callback,
 * session reads/writes, and sign-out.
 */
const handler = (event: { request: Request }) => auth.handler(event.request);

export const GET = handler;
export const POST = handler;
