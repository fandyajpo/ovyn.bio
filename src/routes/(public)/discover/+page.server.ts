import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getMembership, joinGuild, listPublicGuilds } from '#lib/server/services/guilds';
import { AppError } from '#lib/server/utils/errors';
import { rateLimit } from '#lib/server/utils/rate-limit';

export const load: PageServerLoad = async ({ locals, url }) => {
	const q = url.searchParams.get('q');
	const [guilds, membership] = await Promise.all([
		listPublicGuilds(q),
		locals.user ? getMembership(locals.user.id) : Promise.resolve(null)
	]);
	return { guilds, q, membership };
};

export const actions: Actions = {
	join: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Sign in to join a circle' });

		const data = await request.formData();
		const slug = data.get('slug');
		if (typeof slug !== 'string') return fail(422, { error: 'Invalid request' });

		try {
			await rateLimit(`join:${locals.user.id}`, 10, 60_000);
			await joinGuild(locals.user.id, slug);
			return { ok: true };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not join the circle' });
		}
	}
};
