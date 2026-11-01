import type { PageServerLoad } from './$types';
import { getOrderWithPayment } from '#lib/server/services/billing';

export const load: PageServerLoad = async ({ params, locals }) => {
	const row = await getOrderWithPayment(params.orderId, locals.user!.id);
	return row;
};
