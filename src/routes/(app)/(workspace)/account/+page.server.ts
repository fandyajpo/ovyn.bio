import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserPlan } from '#lib/server/services/billing';
import { getProfileAnalytics } from '#lib/server/services/engagement';
import { listOwnedByKind } from '#lib/server/services/cosmetics';
import { isPlatformAdmin } from '#lib/server/services/admin';
import { getProfileByUserId } from '#lib/server/services/profiles';
import { getMembership } from '#lib/server/services/guilds';
import { presignDownload } from '#lib/server/storage';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const userId = locals.user.id;
	const [profile, plan] = await Promise.all([getProfileByUserId(userId), getUserPlan(userId)]);
	// The profile picture is whatever the database says: the uploaded avatar or
	// nothing. Provider identities never substitute for it.
	const [owned, analytics, isAdmin, circle, avatarUrl] = await Promise.all([
		listOwnedByKind(userId),
		getProfileAnalytics(userId),
		isPlatformAdmin(userId),
		getMembership(userId),
		profile.avatarKey ? presignDownload(profile.avatarKey) : null
	]);

	return { profile, avatarUrl, owned, analytics, plan, isAdmin, circle };
};
