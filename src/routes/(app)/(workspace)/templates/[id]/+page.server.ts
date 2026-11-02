import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { normalizeTemplateBlocks, updateProfileTemplateSchema } from '#lib/schemas/templates';
import { getOwnedProfileTemplate, updateProfileTemplate } from '#lib/server/services/profile-content';
import { getUserPlan } from '#lib/server/services/billing';
import { AppError } from '#lib/server/utils/errors';
import { rateLimit } from '#lib/server/utils/rate-limit';

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
	const errors: Record<string, string> = {};
	for (const issue of issues) {
		const key = issue.path.length > 1 ? `${String(issue.path[0])}-${String(issue.path[1])}` : String(issue.path[0]);
		if (!errors[key]) errors[key] = issue.message;
	}
	return errors;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(302, '/login');
	// Any other id would reach Postgres as an invalid uuid and fail there.
	if (!UUID_PATTERN.test(params.id)) error(404, 'Template not found');
	const [template, plan] = await Promise.all([
		getOwnedProfileTemplate(locals.user.id, params.id),
		getUserPlan(locals.user.id)
	]);
	if (!template) error(404, 'Template not found');
	return { template: { ...template, blocks: normalizeTemplateBlocks(template.blocks) }, plan };
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		if (!locals.user) redirect(302, '/login');
		const data = await request.formData();
		const blocksJson = data.get('blocks');
		const parsed = updateProfileTemplateSchema.safeParse({
			id: params.id,
			name: data.get('name'),
			description: data.get('description'),
			theme: data.get('theme'),
			isPublic: data.get('isPublic'),
			blocks: blocksJson
		});
		if (!parsed.success) {
			return fail(422, {
				error: parsed.error.issues[0]?.message ?? 'Check the layout and try again',
				fieldErrors: fieldErrors(parsed.error.issues),
				values: {
					name: data.get('name'),
					description: data.get('description'),
					theme: data.get('theme'),
					isPublic: data.get('isPublic') === 'on'
				},
				blocksJson: typeof blocksJson === 'string' ? blocksJson : null
			});
		}

		try {
			if ((await getUserPlan(locals.user.id)).tier !== 'premium') {
				return fail(403, { error: 'Editing profile layouts is a Premium feature' });
			}
			await rateLimit(`profile-template-save:${locals.user.id}`, 40, 60_000);
			await updateProfileTemplate(locals.user.id, parsed.data);
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not save this layout' });
		}

		redirect(303, `/templates?saved=${encodeURIComponent(parsed.data.name)}`);
	}
};
