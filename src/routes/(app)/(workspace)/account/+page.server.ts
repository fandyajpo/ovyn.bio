import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserPlan } from '#lib/server/services/billing';
import { getProfileAnalytics } from '#lib/server/services/engagement';
import { listOwnedByKind } from '#lib/server/services/cosmetics';
import { getDiscordAccountByUserId, getProfileByUserId } from '#lib/server/services/profiles';
import { presignDownload } from '#lib/server/storage';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const userId = locals.user.id;
	const [profile, discord, owned, analytics, plan] = await Promise.all([
		getProfileByUserId(userId),
		getDiscordAccountByUserId(userId),
		listOwnedByKind(userId),
		getProfileAnalytics(userId),
		getUserPlan(userId)
	]);
	const avatarUrl = profile.avatarKey ? await presignDownload(profile.avatarKey) : discord?.avatarUrl ?? locals.user.image ?? null;

	return { profile, avatarUrl, owned, analytics, plan };
};
