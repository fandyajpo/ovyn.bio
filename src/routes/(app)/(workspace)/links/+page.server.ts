import { fail, redirect } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';
import { profileLinkIdSchema, profileLinkOrderSchema, profileLinkSchema, profileLinkUpdateSchema } from '#lib/schemas/profile-links';
import { addProfileLink, deleteProfileLink, listProfileLinks, reorderProfileLinks, updateProfileLink } from '#lib/server/services/profile-content';
import { AppError } from '#lib/server/utils/errors';
import { rateLimit } from '#lib/server/utils/rate-limit';

// Defined at module level so the adapter cache is reused between requests.
const linkFormAdapter = zod4(profileLinkSchema);

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const [links, form] = await Promise.all([
		listProfileLinks(locals.user.id),
		superValidate({ provider: 'instagram' as const, url: '' }, linkFormAdapter)
	]);
	return { links, form };
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const form = await superValidate(request, linkFormAdapter);
		if (!form.valid) return fail(422, { form });

		try {
			await rateLimit(`profile-links:${locals.user.id}`, 30, 60_000);
			await addProfileLink(locals.user.id, form.data);
			return message(form, 'Link added.');
		} catch (err) {
			if (err instanceof AppError) {
				message(form, err.message);
				return fail(err.status, { form });
			}
			console.error(err);
			message(form, 'Could not add this link');
			return fail(500, { form });
		}
	},

	reorder: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const data = await request.formData();
		const parsed = profileLinkOrderSchema.safeParse({ ids: data.getAll('id') });
		if (!parsed.success) return fail(422, { error: 'That order could not be saved' });

		try {
			await rateLimit(`profile-links:${locals.user.id}`, 30, 60_000);
			await reorderProfileLinks(locals.user.id, parsed.data.ids);
			return { ok: 'Order saved.' };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not save the new order' });
		}
	},

	update: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const data = await request.formData();
		const label = data.get('label');
		const parsed = profileLinkUpdateSchema.safeParse({
			id: data.get('id'),
			provider: data.get('provider'),
			url: data.get('url'),
			label: typeof label === 'string' ? label : undefined
		});
		if (!parsed.success) return fail(422, { error: parsed.error.issues[0]?.message ?? 'Check the link details' });

		try {
			await rateLimit(`profile-links:${locals.user.id}`, 30, 60_000);
			await updateProfileLink(locals.user.id, parsed.data);
			return { ok: 'Link updated.' };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not update this link' });
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
