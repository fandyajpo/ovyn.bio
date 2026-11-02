import type { LayoutServerLoad } from './$types';
import { requirePlatformAdmin } from '#lib/server/admin';

export const load: LayoutServerLoad = async ({ locals }) => {
	await requirePlatformAdmin(locals.user?.id);
	return {};
};
