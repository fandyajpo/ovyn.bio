import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { adminCreateProductSchema, adminUpdateProductSchema } from '#lib/schemas/admin';
import { requirePlatformAdmin } from '#lib/server/admin';
import { createCatalogProduct, listAdminProducts, updateCatalogProduct } from '#lib/server/services/admin';
import { AppError } from '#lib/server/utils/errors';

function formValues(formData: FormData) {
	return Object.fromEntries(formData.entries());
}

function validationMessage(issues: { message: string }[]) {
	return issues[0]?.message ?? 'Check the product details and try again';
}

export const load: PageServerLoad = async ({ locals }) => {
	await requirePlatformAdmin(locals.user?.id);
	return { products: await listAdminProducts() };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		await requirePlatformAdmin(locals.user?.id);
		const parsed = adminCreateProductSchema.safeParse(formValues(await request.formData()));
		if (!parsed.success) return fail(422, { error: validationMessage(parsed.error.issues) });

		try {
			await createCatalogProduct(parsed.data);
			return { ok: 'Product created.' };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not create product' });
		}
	},

	update: async ({ request, locals }) => {
		await requirePlatformAdmin(locals.user?.id);
		const parsed = adminUpdateProductSchema.safeParse(formValues(await request.formData()));
		if (!parsed.success) return fail(422, { error: validationMessage(parsed.error.issues) });

		try {
			await updateCatalogProduct(parsed.data);
			return { ok: 'Changes saved.' };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not update product' });
		}
	}
};
