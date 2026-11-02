import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { adminCreateProductSchema, adminUpdateProductSchema } from '#lib/schemas/admin';
import { requirePlatformAdmin } from '#lib/server/admin';
import { createCatalogProduct, listAdminProducts, updateCatalogProduct } from '#lib/server/services/admin';
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

export const load: PageServerLoad = async ({ locals }) => {
	await requirePlatformAdmin(locals.user?.id);
	return { products: await listAdminProducts() };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		await requirePlatformAdmin(locals.user?.id);
		const submittedValues = formValues(await request.formData());
		const parsed = adminCreateProductSchema.safeParse(submittedValues);
		if (!parsed.success) {
			return fail(422, {
				error: validationMessage(parsed.error.issues),
				fieldErrors: fieldErrors(parsed.error.issues),
				action: 'create' as const,
				submittedValues
			});
		}

		try {
			await createCatalogProduct(parsed.data);
			return { ok: 'Product created.' };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message, action: 'create' as const, submittedValues });
			console.error(err);
			return fail(500, { error: 'Could not create product', action: 'create' as const, submittedValues });
		}
	},

	update: async ({ request, locals }) => {
		await requirePlatformAdmin(locals.user?.id);
		const submittedValues = formValues(await request.formData());
		const submittedId = submittedValues.id;
		const parsed = adminUpdateProductSchema.safeParse(submittedValues);
		if (!parsed.success) {
			return fail(422, {
				error: validationMessage(parsed.error.issues),
				fieldErrors: fieldErrors(parsed.error.issues),
				action: 'update' as const,
				submittedId,
				submittedValues
			});
		}

		try {
			await updateCatalogProduct(parsed.data);
			return { ok: 'Changes saved.' };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message, action: 'update' as const, submittedId, submittedValues });
			console.error(err);
			return fail(500, { error: 'Could not update product', action: 'update' as const, submittedId, submittedValues });
		}
	}
};
