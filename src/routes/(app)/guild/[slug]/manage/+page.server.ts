import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getGuildBySlug,
	getMembership,
	listGuildMembers,
	removeMember,
	setMemberRole,
	transferOwnership,
	updateGuild
} from '$lib/server/services/guilds';
import {
	cancelInvitation,
	createInvitation,
	listGuildInvitations
} from '$lib/server/services/invitations';
import { AppError } from '$lib/server/utils/errors';
import { rateLimit } from '$lib/server/utils/rate-limit';

export const load: PageServerLoad = async ({ params, locals }) => {
	const guild = await getGuildBySlug(params.slug);
	if (!guild) fail(404, 'Guild not found');

	const membership = await getMembership(locals.user!.id);
	if (!membership || membership.guild.id !== guild.id) {
		fail(403, 'You are not a member of this guild');
	}

	const role = membership.membership.role;
	const canManage = role === 'owner' || role === 'officer';

	const [members, invitations] = await Promise.all([
		listGuildMembers(guild.id),
		canManage ? listGuildInvitations(guild.id) : Promise.resolve([])
	]);

	return { guild, role, members, invitations };
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const data = await request.formData();
		const intent = data.get('intent');
		const user = locals.user!;

		const guild = await getGuildBySlug(params.slug);
		if (!guild) return fail(404, { error: 'Guild not found' });

		const membership = await getMembership(user.id);
		if (!membership || membership.guild.id !== guild.id) {
			return fail(403, { error: 'You are not a member of this guild' });
		}

		try {
			rateLimit(`guild-manage:${user.id}`, 30, 60_000);

			const userId = data.get('userId');
			const invitationId = data.get('invitationId');

			switch (intent) {
				case 'settings':
					await updateGuild(user.id, guild.id, {
						name: String(data.get('name') || guild.name),
						description: (data.get('description') as string) || null,
						visibility: data.get('visibility') === 'private' ? 'private' : 'public'
					});
					return { ok: 'Settings saved' };

				case 'invite':
					if (typeof userId !== 'string') return fail(422, { error: 'Invalid user' });
					await createInvitation(user.id, userId);
					return { ok: 'Invitation sent' };

				case 'cancel-invite':
					if (typeof invitationId !== 'string') return fail(422, { error: 'Invalid invitation' });
					await cancelInvitation(user.id, invitationId);
					return { ok: 'Invitation cancelled' };

				case 'promote': {
					const role = data.get('role') === 'officer' ? 'officer' : 'member';
					if (typeof userId !== 'string') return fail(422, { error: 'Invalid user' });
					await setMemberRole(user.id, userId, role);
					return { ok: 'Role updated' };
				}

				case 'transfer':
					if (typeof userId !== 'string') return fail(422, { error: 'Invalid user' });
					await transferOwnership(user.id, userId);
					return { ok: 'Ownership transferred' };

				case 'remove':
					if (typeof userId !== 'string') return fail(422, { error: 'Invalid user' });
					await removeMember(user.id, userId);
					return { ok: 'Member removed' };

				default:
					return fail(422, { error: 'Unknown action' });
			}
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Something went wrong' });
		}
	}
};
