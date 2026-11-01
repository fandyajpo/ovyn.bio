import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { acceptInvitation, listMyInvitations, rejectInvitation } from '#lib/server/services/invitations';
import { getMembership } from '#lib/server/services/guilds';
import { AppError } from '#lib/server/utils/errors';
import { rateLimit } from '#lib/server/utils/rate-limit';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const [invitations, membership] = await Promise.all([
		listMyInvitations(locals.user.id),
		getMembership(locals.user.id)
	]);
	return { invitations, membership: membership?.membership ?? null };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const user = locals.user;
		const data = await request.formData();
		const invitationId = data.get('invitationId');
		const intent = data.get('intent');

		if (typeof invitationId !== 'string') return fail(422, { error: 'Invalid request' });

		try {
			rateLimit(`invite-action:${user.id}`, 20, 60_000);
			if (intent === 'accept') {
				const guild = await acceptInvitation(user.id, invitationId);
				return { ok: true, slug: guild.slug };
			} else if (intent === 'reject') {
				await rejectInvitation(user.id, invitationId);
				return { ok: true };
			}
			return fail(422, { error: 'Unknown action' });
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Something went wrong' });
		}
	}
};