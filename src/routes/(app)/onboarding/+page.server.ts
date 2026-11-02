import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { onboardingSchema } from '#lib/schemas/onboarding';
import { saveOnboarding } from '#lib/server/services/onboarding';
import { getProfileByUserId } from '#lib/server/services/profiles';
import { AppError } from '#lib/server/utils/errors';
import { rateLimit } from '#lib/server/utils/rate-limit';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const profile = await getProfileByUserId(locals.user.id);
	if (profile.onboardedAt) redirect(302, '/account');
	return {
		displayName: profile.displayName ?? locals.user.name,
		slug: profile.slug
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const data = await request.formData();
		const parsed = onboardingSchema.safeParse({
			persona: data.get('persona'),
			foundVia: data.get('foundVia')
		});
		if (!parsed.success) return fail(422, { error: 'Pick an option on each step to continue' });

		try {
			await rateLimit(`onboarding:${locals.user.id}`, 10, 60_000);
			await saveOnboarding(locals.user.id, parsed.data);
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not save your answers' });
		}

		redirect(303, '/account');
	}
};
