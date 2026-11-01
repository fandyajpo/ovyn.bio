import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listUserOrders } from '#lib/server/services/billing';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	return { orders: await listUserOrders(locals.user.id) };
};