import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { profileLinkIdSchema, profileLinkSchema } from '#lib/schemas/profile-links';
import { addProfileLink, deleteProfileLink, listProfileLinks } from '#lib/server/services/profile-content';
import { AppError } from '#lib/server/utils/errors';
import { rateLimit } from '#lib/server/utils/rate-limit';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	return { links: await listProfileLinks(locals.user.id) };
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const data = await request.formData();
		const label = data.get('label');
		const values = {
			provider: data.get('provider'),
			url: data.get('url'),
			label: typeof label === 'string' ? label : undefined
		};
		const parsed = profileLinkSchema.safeParse(values);
		if (!parsed.success) return fail(422, { error: parsed.error.issues[0]?.message ?? 'Check the link details' });

		try {
			await rateLimit(`profile-links:${locals.user.id}`, 30, 60_000);
			await addProfileLink(locals.user.id, parsed.data);
			return { ok: 'Link added.' };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not add this link' });
		}
	},

	remove: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const data = await request.formData();
		const parsed = profileLinkIdSchema.safeParse({ id: data.get('id') });
		if (!parsed.success) return fail(422, { error: 'Invalid link' });

		try {
			await rateLimit(`profile-links:${locals.user.id}`, 30, 60_000);
			await deleteProfileLink(locals.user.id, parsed.data.id);
			return { ok: 'Link removed.' };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not remove this link' });
		}
	}
};
