import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createCheckout, listActiveProducts } from '$lib/server/services/billing';
import { AppError } from '$lib/server/utils/errors';
import { rateLimit } from '$lib/server/utils/rate-limit';

export const load: PageServerLoad = async () => {
	return { products: await listActiveProducts() };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const data = await request.formData();
		const productId = data.get('productId');
		if (typeof productId !== 'string' || !productId) {
			return fail(422, { error: 'Pick a plan first' });
		}

		try {
			rateLimit(`checkout:${locals.user!.id}`, 5, 60_000);
			const { order } = await createCheckout(locals.user!.id, productId);
			redirect(302, `/checkout/${order.id}`);
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			throw err; // redirect() control flow
		}
	}
};
