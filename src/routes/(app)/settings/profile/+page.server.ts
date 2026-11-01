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

		const parsed = profileUpdateSchema.safeParse({
			displayName: data.get('displayName'),
			slug: data.get('slug'),
			bio: data.get('bio') || null,
			visibility: data.get('visibility')
		});

		if (!parsed.success) {
			const issue = parsed.error.issues[0];
			return fail(422, { error: issue?.message ?? 'Invalid input' });
		}
		if (!isValidSlug(parsed.data.slug)) {
			return fail(422, { error: 'That username is not available' });
		}

		try {
			rateLimit(`profile-update:${user.id}`, 10, 60_000);
			await updateProfile(user.id, parsed.data);
			return { ok: true };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not save your profile' });
		}
	}
};
