import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { listShop, redeemCosmeticWithPoints, setEquippedCosmetic, type CosmeticKind } from '#lib/server/services/cosmetics';
import { createCheckout } from '#lib/server/services/billing';
import { AppError } from '#lib/server/utils/errors';
import { rateLimit } from '#lib/server/utils/rate-limit';

// Buying through the shop creates a DOKU virtual account server-side.
export const config = { maxDuration: 30 };

export const load: PageServerLoad = async ({ locals }) => {
	return { items: await listShop(locals.user?.id ?? null) };
};

export const actions: Actions = {
	buy: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const user = locals.user;
		const data = await request.formData();
		const productId = data.get('productId');

		if (typeof productId !== 'string' || !productId) {
			return fail(422, { error: 'Invalid item' });
		}

		try {
			await rateLimit(`shop-buy:${user.id}`, 5, 60_000);
			const { order } = await createCheckout(user.id, productId);
			redirect(302, `/checkout/${order.id}`);
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			throw err; // redirect() control flow
		}
	},

	redeem: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const data = await request.formData();
		const cosmeticId = data.get('cosmeticId');
		if (typeof cosmeticId !== 'string' || !cosmeticId) return fail(422, { error: 'Invalid item' });
		try {
			await rateLimit(`shop-redeem:${locals.user.id}`, 10, 60_000);
			await redeemCosmeticWithPoints(locals.user.id, cosmeticId);
			return { ok: true };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not redeem item' });
		}
	},

	equip: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const user = locals.user;
		const data = await request.formData();
		const cosmeticId = data.get('cosmeticId');
		const kind = data.get('kind');

		if (typeof kind !== 'string' || !['frame', 'wallpaper', 'badge'].includes(kind)) {
			return fail(422, { error: 'Invalid kind' });
		}

		try {
			await rateLimit(`shop-equip:${user.id}`, 20, 60_000);
			await setEquippedCosmetic(
				user.id,
				kind as CosmeticKind,
				typeof cosmeticId === 'string' && cosmeticId ? cosmeticId : null
			);
			return { ok: true };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			console.error(err);
			return fail(500, { error: 'Could not equip' });
		}
	}
};