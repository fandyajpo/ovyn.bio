import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGuildBySlug, getMembership } from '$lib/server/services/guilds';
import { listUsernamesForInvite } from '$lib/server/services/invitations';

/** Live search for invitation candidates: GET ?q=<query> */
export const GET: RequestHandler = async ({ url, params, locals }) => {
	const guild = await getGuildBySlug(params.slug);
	if (!guild) return json([], { status: 404 });

	const membership = await getMembership(locals.user!.id);
	if (!membership || membership.guild.id !== guild.id) return json([], { status: 403 });
	if (membership.membership.role === 'member') return json([]);

	const q = url.searchParams.get('q') ?? '';
	return json(await listUsernamesForInvite(guild.id, q));
};
