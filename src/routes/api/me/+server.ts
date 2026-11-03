import type { RequestHandler } from './$types';
import { getDiscordAccountByUserId, getProfileByUserId } from '#lib/server/services/profiles';
import { presignDownload } from '#lib/server/storage';

/**
 * The signed-in viewer as the navbar needs them: the display name and the same
 * avatar the public page shows (uploaded picture first, then the provider one).
 */
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return Response.json({ viewer: null }, { headers: { 'cache-control': 'no-store' } });
	}

	const fallback = { name: locals.user.name, image: null };

	try {
		const [profile, discord] = await Promise.all([
			getProfileByUserId(locals.user.id),
			getDiscordAccountByUserId(locals.user.id)
		]);

		// The profile picture follows the database alone: an uploaded avatar or
		// no picture at all. Provider images are never substituted.
		const image = profile.avatarKey ? await presignDownload(profile.avatarKey) : null;

		const name = profile.displayName || discord?.globalName || discord?.username || locals.user.name;

		return Response.json({ viewer: { name, image } }, { headers: { 'cache-control': 'no-store' } });
	} catch {
		return Response.json({ viewer: fallback }, { headers: { 'cache-control': 'no-store' } });
	}
};
