import type { PageServerLoad } from './$types';
import { listUserOrders } from '$lib/server/services/billing';

export const load: PageServerLoad = async ({ locals }) => {
	return { orders: await listUserOrders(locals.user!.id) };
};
