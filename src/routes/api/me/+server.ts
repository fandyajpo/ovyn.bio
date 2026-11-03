import type { RequestHandler } from './$types';
import { getProfileByUserId } from '#lib/server/services/profiles';
import { presignDownload } from '#lib/server/storage';

/**
 * The signed-in viewer as the navbar needs them: the database profile's display
 * name and avatar, never a provider identity.
 */
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return Response.json({ viewer: null }, { headers: { 'cache-control': 'no-store' } });
	}

	const fallback = { name: locals.user.name, image: null };

	try {
		const profile = await getProfileByUserId(locals.user.id);

		const image = profile.avatarKey ? await presignDownload(profile.avatarKey) : null;
		const name = profile.displayName || profile.slug;

		return Response.json({ viewer: { name, image } }, { headers: { 'cache-control': 'no-store' } });
	} catch {
		return Response.json({ viewer: fallback }, { headers: { 'cache-control': 'no-store' } });
	}
};