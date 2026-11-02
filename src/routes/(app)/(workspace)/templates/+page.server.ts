import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createProfileTemplateSchema,
	profileTemplateIdSchema,
	updateProfileTemplateVisibilitySchema
} from '#lib/schemas/templates';
import { createProfileTemplate, applyProfileTemplate, deleteProfileTemplate, listProfileTemplates, setProfileTemplateVisibility } from '#lib/server/services/profile-content';
import { getProfileByUserId } from '#lib/server/services/profiles';
import { AppError } from '#lib/server/utils/errors';
import { rateLimit } from '#lib/server/utils/rate-limit';
import { getUserPlan } from '#lib/server/services/billing';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const [profile, templates, plan] = await Promise.all([
		getProfileByUserId(locals.user.id),
		listProfileTemplates(locals.user.id),
		getUserPlan(locals.user.id)
	]);
	return { profile, templates, plan };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		let createdId: string | null = null;
		const data = await request.formData();
		const parsed = createProfileTemplateSchema.safeParse({
			name: data.get('name'),
			description: data.get('description'),
			theme: data.get('theme'),
			isPublic: data.get('isPublic')
		});
		if (!parsed.success) return fail(422, { error: parsed.error.issues[0]?.message ?? 'Check the template details' });

		try {
			if ((await getUserPlan(locals.user.id)).tier !== 'premium') {
				return fail(403, { error: 'Saving profile layouts is a Premium feature' });
			}
			rateLimit(`profile-templates:${locals.user.id}`, 20, 60_000);
			const created = await createProfileTemplate(locals.user.id, parsed.data);
			createdId = created.id;
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not save your template' });
		}

		if (!createdId) return fail(500, { error: 'Could not create your template' });
		redirect(303, `/templates/${createdId}`);
	},

	apply: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const data = await request.formData();
		const parsed = profileTemplateIdSchema.safeParse({ id: data.get('id') });
		if (!parsed.success) return fail(422, { error: 'Invalid template' });

		try {
			if ((await getUserPlan(locals.user.id)).tier !== 'premium') {
				return fail(403, { error: 'Applying profile layouts is a Premium feature' });
			}
			rateLimit(`profile-template-apply:${locals.user.id}`, 30, 60_000);
			await applyProfileTemplate(locals.user.id, parsed.data.id);
			return { ok: 'Template applied to your page.' };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not apply this template' });
		}
	},

	visibility: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const data = await request.formData();
		const parsed = updateProfileTemplateVisibilitySchema.safeParse({
			id: data.get('id'),
			isPublic: data.get('isPublic')
		});
		if (!parsed.success) return fail(422, { error: 'Invalid template setting' });

		try {
			rateLimit(`profile-templates:${locals.user.id}`, 20, 60_000);
			await setProfileTemplateVisibility(locals.user.id, parsed.data.id, parsed.data.isPublic);
			return { ok: parsed.data.isPublic ? 'Template shared publicly.' : 'Template is private.' };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not update sharing' });
		}
	},

	remove: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const data = await request.formData();
		const parsed = profileTemplateIdSchema.safeParse({ id: data.get('id') });
		if (!parsed.success) return fail(422, { error: 'Invalid template' });

		try {
			rateLimit(`profile-templates:${locals.user.id}`, 20, 60_000);
			await deleteProfileTemplate(locals.user.id, parsed.data.id);
			return { ok: 'Template deleted.' };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not delete this template' });
		}
	}
};
