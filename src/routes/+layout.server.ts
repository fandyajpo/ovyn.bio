import type { LayoutServerLoad } from './$types';
import { isPlatformAdmin } from '#lib/server/services/admin';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.user ? { name: locals.user.name, image: locals.user.image } : null,
		isAdmin: await isPlatformAdmin(locals.user?.id ?? null)
	};
};
