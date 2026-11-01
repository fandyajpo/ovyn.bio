import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db';
import { discordAccounts } from '#lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getMembership } from '#lib/server/services/guilds';
import { getProfileByUserId } from '#lib/server/services/profiles';
import { listMyInvitations } from '#lib/server/services/invitations';
import { listUserOrders } from '#lib/server/services/billing';
import { presignDownload } from '#lib/server/storage';

export const load: PageServerLoad = async ({ locals }) => {
	// Layout and page loads run in parallel — guard here too.
	if (!locals.user) redirect(302, '/login');

	const user = locals.user;

	const profile = await getProfileByUserId(user.id);
	const membership = await getMembership(user.id);

	// Avatar: uploaded OVYN avatar wins, else the synced Discord avatar.
	const [discord] = await db
		.select({ avatarUrl: discordAccounts.avatarUrl })
		.from(discordAccounts)
		.where(eq(discordAccounts.userId, user.id))
		.limit(1);

	const [avatarUrl, invitations, orders] = await Promise.all([
		profile.avatarKey ? presignDownload(profile.avatarKey) : (discord?.avatarUrl ?? null),
		listMyInvitations(user.id),
		listUserOrders(user.id)
	]);

	return {
		profile,
		avatarUrl,
		guild: membership?.guild ?? null,
		membership: membership?.membership ?? null,
		invitations,
		pendingOrder: orders.find((o) => o.order.status === 'pending')?.order ?? null
	};
};