import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getUserPlan } from '#lib/server/services/billing';
import { getProfileByUserId } from '#lib/server/services/profiles';
import { presignDownload } from '#lib/server/storage';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const profile = await getProfileByUserId(locals.user.id);
	// A fresh account answers the two onboarding questions before it lands here.
	if (!profile.onboardedAt) redirect(302, '/onboarding');
	// The sidebar picture follows the database avatar alone.
	const [plan, userImage] = await Promise.all([
		getUserPlan(locals.user.id),
		profile.avatarKey ? presignDownload(profile.avatarKey) : null
	]);
	return {
		profileSlug: profile.slug,
		currentPlan: plan,
		userName: locals.user.name,
		userImage
	};
};