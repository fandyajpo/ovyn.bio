import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createCheckout } from '#lib/server/services/billing';
import { getMembership } from '#lib/server/services/guilds';
import { listSpotlightProducts } from '#lib/server/services/spotlights';
import { AppError } from '#lib/server/utils/errors';
import { rateLimit } from '#lib/server/utils/rate-limit';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const [profileProducts, guildProducts, membership] = await Promise.all([
		listSpotlightProducts('profile'),
		listSpotlightProducts('guild'),
		getMembership(locals.user.id)
	]);
	return {
		userId: locals.user.id,
		profileProducts,
		guildProducts: membership?.membership.role === 'owner' ? guildProducts : [],
		guild: membership?.membership.role === 'owner' ? membership.guild : null
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const user = locals.user;
		const data = await request.formData();
		const productId = data.get('productId');
		const targetType = data.get('targetType');
		const targetId = data.get('targetId');

		if (typeof productId !== 'string' || (targetType !== 'profile' && targetType !== 'guild')) {
			return fail(422, { error: 'Invalid spotlight selection' });
		}
		if (typeof targetId !== 'string' || !targetId) return fail(422, { error: 'Missing spotlight target' });

		try {
			rateLimit(`spotlight:${user.id}`, 5, 60_000);
			const { order } = await createCheckout(user.id, productId, { type: targetType, id: targetId });
			redirect(302, `/checkout/${order.id}`);
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			throw err;
		}
	}
};
