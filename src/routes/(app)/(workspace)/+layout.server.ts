import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getUserPlan } from '#lib/server/services/billing';
import { getProfileByUserId } from '#lib/server/services/profiles';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const [profile, plan] = await Promise.all([
		getProfileByUserId(locals.user.id),
		getUserPlan(locals.user.id)
	]);
	return {
		profileSlug: profile.slug,
		currentPlan: plan,
		userName: locals.user.name,
		userImage: locals.user.image ?? null
	};
};
