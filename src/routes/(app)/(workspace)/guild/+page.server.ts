import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { disbandGuild, getMembership, leaveGuild, listGuildMembers } from '#lib/server/services/guilds';
import { AppError } from '#lib/server/utils/errors';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const membership = await getMembership(locals.user.id);
	const members = membership ? await listGuildMembers(membership.guild.id) : [];
	return { guild: membership?.guild ?? null, membership: membership?.membership ?? null, members };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const user = locals.user;
		const data = await request.formData();
		const intent = data.get('intent');

		try {
			if (intent === 'leave') {
				await leaveGuild(user.id);
			} else if (intent === 'disband') {
				await disbandGuild(user.id);
			} else {
				return fail(422, { error: 'Unknown action' });
			}
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Something went wrong' });
		}

		return { success: true };
	}
};