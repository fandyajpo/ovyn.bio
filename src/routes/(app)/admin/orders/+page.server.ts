import type { PageServerLoad } from './$types';
import { requirePlatformAdmin } from '#lib/server/admin';
import { listAdminOrders } from '#lib/server/services/admin';

export const load: PageServerLoad = async ({ locals }) => {
	await requirePlatformAdmin(locals.user?.id);
	return { orders: await listAdminOrders(100) };
};
