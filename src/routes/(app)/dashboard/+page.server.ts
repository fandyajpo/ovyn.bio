import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db';
import { discordAccounts } from '#lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getMembership } from '#lib/server/services/guilds';
import { getProfileByUserId } from '#lib/server/services/profiles';
import { listMyInvitations } from '#lib/server/services/invitations';
import { listUserOrders } from '#lib/server/services/billing';
import {
	claimDailyCheckin,
	getOrCreateReferralCode,
	getProfileAnalytics,
	getReferralSummary,
	getRewardSummary,
	REWARD_VALUES
} from '#lib/server/services/engagement';
import { AppError } from '#lib/server/utils/errors';
import { rateLimit } from '#lib/server/utils/rate-limit';
import { presignDownload } from '#lib/server/storage';
import { BETTER_AUTH_URL } from '$app/env/private';

export const load: PageServerLoad = async ({ locals }) => {
	// Layout and page server loads run in parallel — guard here too.
	if (!locals.user) redirect(302, '/login');
	const user = locals.user;

	const profile = await getProfileByUserId(user.id);
	const membership = await getMembership(user.id);
	const [discord, invitations, orders, rewards, referralCode, analytics, referralSummary] = await Promise.all([
		db.select({ avatarUrl: discordAccounts.avatarUrl }).from(discordAccounts)
			.where(eq(discordAccounts.userId, user.id)).limit(1),
		listMyInvitations(user.id),
		listUserOrders(user.id),
		getRewardSummary(user.id),
		getOrCreateReferralCode(user.id),
		getProfileAnalytics(user.id),
		getReferralSummary(user.id)
	]);
	const avatarUrl = profile.avatarKey ? await presignDownload(profile.avatarKey) : discord[0]?.avatarUrl ?? null;

	return {
		profile,
		avatarUrl,
		guild: membership?.guild ?? null,
		membership: membership?.membership ?? null,
		invitations,
		pendingOrder: orders.find((o) => o.order.status === 'pending')?.order ?? null,
		rewards,
		referralUrl: `${(BETTER_AUTH_URL ?? 'https://ovyn.bio').replace(/\/$/, '')}/invite/${referralCode}`,
		referralSummary,
		rewardValues: REWARD_VALUES,
		analytics
	};
};

export const actions: Actions = {
	checkin: async ({ locals }) => {
		if (!locals.user) redirect(302, '/login');
		try {
			rateLimit(`daily-checkin:${locals.user.id}`, 5, 60_000);
			return { checkin: await claimDailyCheckin(locals.user.id) };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not check in today' });
		}
	}
};
