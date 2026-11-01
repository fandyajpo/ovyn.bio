import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getOrderWithPayment } from '#lib/server/services/billing';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) redirect(302, '/login');
	const row = await getOrderWithPayment(params.orderId, locals.user.id);
	return row;
};