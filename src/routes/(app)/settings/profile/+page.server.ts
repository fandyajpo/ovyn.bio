import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { profileVisibilitySchema } from '#lib/schemas/profile';
import { getProfileByUserId, setProfileBanner, setProfileVisibility } from '#lib/server/services/profiles';
import { presignDownload } from '#lib/server/storage';
import { AppError } from '#lib/server/utils/errors';
import { rateLimit } from '#lib/server/utils/rate-limit';

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
	visibility: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const user = locals.user;
		const data = await request.formData();

		const parsed = profileVisibilitySchema.safeParse({ visibility: data.get('visibility') });
		if (!parsed.success) {
			return fail(422, { error: 'Invalid input' });
		}

		try {
			rateLimit(`profile-visibility:${user.id}`, 10, 60_000);
			await setProfileVisibility(user.id, parsed.data.visibility);
			return { ok: true };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not update visibility' });
		}
	},

	wallpaper: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const user = locals.user;
		const data = await request.formData();
		const key = data.get('key');

		if (typeof key !== 'string' || !key) return fail(422, { error: 'Missing file key' });

		try {
			rateLimit(`wallpaper:${user.id}`, 10, 60_000);
			await setProfileBanner(user.id, key);
			return { ok: true };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not save the wallpaper' });
		}
	}
};
