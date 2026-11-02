import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserPlan } from '#lib/server/services/billing';
import { getProfileAnalytics } from '#lib/server/services/engagement';
import { listOwnedByKind } from '#lib/server/services/cosmetics';
import { isPlatformAdmin } from '#lib/server/services/admin';
import { getDiscordAccountByUserId, getProfileByUserId } from '#lib/server/services/profiles';
import { getMembership } from '#lib/server/services/guilds';
import { presignDownload } from '#lib/server/storage';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const userId = locals.user.id;
	const [profile, discord, owned, analytics, plan, isAdmin, circle] = await Promise.all([
		getProfileByUserId(userId),
		getDiscordAccountByUserId(userId),
		listOwnedByKind(userId),
		getProfileAnalytics(userId),
		getUserPlan(userId),
		isPlatformAdmin(userId),
		getMembership(userId)
	]);
	const avatarUrl = profile.avatarKey ? await presignDownload(profile.avatarKey) : discord?.avatarUrl ?? locals.user.image ?? null;

	return { profile, avatarUrl, owned, analytics, plan, isAdmin, circle };
};
