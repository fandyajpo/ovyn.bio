import type { RequestHandler } from './$types';
import { checkUsernameAvailability } from '#lib/server/services/profiles';
import { AppError } from '#lib/server/utils/errors';
import { rateLimit } from '#lib/server/utils/rate-limit';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) return Response.json({ error: 'unauthenticated' }, { status: 401 });

	try {
		rateLimit(`username-check:${locals.user.id}`, 60, 60_000);
		return Response.json(
			await checkUsernameAvailability(locals.user.id, url.searchParams.get('username') ?? ''),
			{ headers: { 'Cache-Control': 'no-store' } }
		);
	} catch (err) {
		if (err instanceof AppError) return Response.json({ error: err.message }, { status: err.status });
		console.error(err);
		return Response.json({ error: 'Could not check username availability' }, { status: 500 });
	}
};
