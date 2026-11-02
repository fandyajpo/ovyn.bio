import type { PageServerLoad } from './$types';
import { requirePlatformAdmin } from '#lib/server/admin';
import { listAdminProducts } from '#lib/server/services/admin';

export const load: PageServerLoad = async ({ locals }) => {
	await requirePlatformAdmin(locals.user?.id);
	return { products: await listAdminProducts() };
};
