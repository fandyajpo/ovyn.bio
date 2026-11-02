import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createCheckout, getUserPlan, listActiveProducts } from '#lib/server/services/billing';
import { AppError } from '#lib/server/utils/errors';
import { rateLimit } from '#lib/server/utils/rate-limit';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const [products, plan] = await Promise.all([
		listActiveProducts(),
		getUserPlan(locals.user.id)
	]);
	return { products, plan };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const user = locals.user;

		const data = await request.formData();
		const productId = data.get('productId');
		if (typeof productId !== 'string' || !productId) {
			return fail(422, { error: 'Pick a plan first' });
		}

		try {
			rateLimit(`checkout:${user.id}`, 5, 60_000);
			const { order } = await createCheckout(user.id, productId);
			redirect(302, `/checkout/${order.id}`);
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			throw err; // redirect() control flow
		}
	}
};
