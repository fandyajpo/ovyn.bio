import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { profileUpdateSchema } from '#lib/schemas/profile';
import { getProfileByUserId, updateProfile } from '#lib/server/services/profiles';
import { presignDownload } from '#lib/server/storage';
import { AppError } from '#lib/server/utils/errors';
import { rateLimit } from '#lib/server/utils/rate-limit';
import { isValidSlug } from '#lib/server/utils/slug';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const profile = await getProfileByUserId(locals.user.id);
	return {
		profile,
		avatarUrl: profile.avatarKey ? await presignDownload(profile.avatarKey) : null,
		bannerUrl: profile.bannerKey ? await presignDownload(profile.bannerKey) : null
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const user = locals.user;
		const data = await request.formData();