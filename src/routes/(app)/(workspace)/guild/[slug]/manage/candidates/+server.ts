import type { RequestHandler } from './$types';
import { getGuildBySlug, getMembership } from '#lib/server/services/guilds';
import { listUsernamesForInvite } from '#lib/server/services/invitations';

/** Live search for invitation candidates: GET ?q=<query> */
export const GET: RequestHandler = async ({ url, params, locals }) => {
	if (!locals.user) return Response.json([], { status: 401 });

	const guild = await getGuildBySlug(params.slug);
	if (!guild) return Response.json([], { status: 404 });

	const membership = await getMembership(locals.user.id);
	if (!membership || membership.guild.id !== guild.id) return Response.json([], { status: 403 });
	if (membership.membership.role === 'member') return Response.json([]);

	const q = url.searchParams.get('q') ?? '';
	return Response.json(await listUsernamesForInvite(guild.id, q));
};
