import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listOwnedByKind } from '#lib/server/services/cosmetics';
import { presignDownload } from '#lib/server/storage';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const owned = await listOwnedByKind(locals.user.id);
	const badges = await Promise.all(owned.badges.map(async (badge) => ({
		id: badge.id,
		name: badge.name,
		assetUrl: badge.assetKey.startsWith('static/cosmetics/')
			? `/${badge.assetKey.slice('static/'.length)}`
			: await presignDownload(badge.assetKey)
	})));
	return { badges };
};
