import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { adminUpdateProductSchema } from '#lib/schemas/admin';
import { requirePlatformAdmin } from '#lib/server/admin';
import { getAdminProduct, updateCatalogProduct } from '#lib/server/services/admin';
import { AppError } from '#lib/server/utils/errors';

function formValues(formData: FormData) {
	return Object.fromEntries(
		[...formData.entries()].map(([key, value]) => [key, typeof value === 'string' ? value : ''])
	);
}

function validationMessage(issues: { message: string }[]) {
	return issues[0]?.message ?? 'Check the product details and try again';
}

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
	const errors: Record<string, string> = {};
	for (const issue of issues) {
		const field = issue.path[0];
		if (field !== undefined && !errors[String(field)]) errors[String(field)] = issue.message;
	}
	return errors;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	await requirePlatformAdmin(locals.user?.id);
	const row = await getAdminProduct(params.id);
	if (!row) error(404, 'Product not found');
	return { product: row.product, cosmetic: row.cosmetic };
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		await requirePlatformAdmin(locals.user?.id);
		const submittedValues = formValues(await request.formData());
		const parsed = adminUpdateProductSchema.safeParse({ ...submittedValues, id: params.id });
		if (!parsed.success) {
			return fail(422, {
				error: validationMessage(parsed.error.issues),
				fieldErrors: fieldErrors(parsed.error.issues),
				submittedValues
			});
		}

		try {
			await updateCatalogProduct(parsed.data);
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message, submittedValues });
			console.error(err);
			return fail(500, { error: 'Could not update product', submittedValues });
		}

		redirect(303, `/admin/catalog?updated=${encodeURIComponent(parsed.data.name)}`);
	}
};
