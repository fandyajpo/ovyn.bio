import type { PageServerLoad } from './$types';
import { getMembership } from '#lib/server/services/guilds';
import { getProfileByUserId } from '#lib/server/services/profiles';
import { listMyInvitations } from '#lib/server/services/invitations';
import { listUserOrders } from '#lib/server/services/billing';
import { presignDownload } from '#lib/server/storage';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;

	const profile = await getProfileByUserId(user.id);
	const membership = await getMembership(user.id);
	const [avatarUrl, invitations, orders] = await Promise.all([
		profile.avatarKey ? presignDownload(profile.avatarKey) : null,
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
