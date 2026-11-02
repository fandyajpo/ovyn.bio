import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { guildCreateSchema } from '#lib/schemas/guild';
import { createGuild, getMembership } from '#lib/server/services/guilds';
import { AppError } from '#lib/server/utils/errors';
import { rateLimit } from '#lib/server/utils/rate-limit';


export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const membership = await getMembership(locals.user.id);
	if (membership) redirect(302, '/guild');
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const user = locals.user;
		const data = await request.formData();
		const parsed = guildCreateSchema.safeParse({
			name: data.get('name'),
			description: data.get('description') || null,
			visibility: data.get('visibility')
		});

		if (!parsed.success) {
			return fail(422, { error: parsed.error.issues[0]?.message ?? 'Invalid input' });
		}

		try {
			await rateLimit(`guild-create:${user.id}`, 3, 60_000);
			const guild = await createGuild(user.id, parsed.data);
			redirect(302, `/guild/${guild.slug}/manage`);
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			// redirect() throws its own control-flow error - rethrow it.
			throw err;
		}
	}
};