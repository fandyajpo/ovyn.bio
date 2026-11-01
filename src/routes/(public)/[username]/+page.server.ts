import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getProfileBySlug } from '#lib/server/services/profiles';
import { getGuildById, getMembership } from '#lib/server/services/guilds';
import { getEquippedForProfile } from '#lib/server/services/cosmetics';
import { recordProfileView } from '#lib/server/services/engagement';
import { presignDownload } from '#lib/server/storage';

export const load: PageServerLoad = async ({ params, locals }) => {
	const row = await getProfileBySlug(params.username);
	if (!row) error(404, 'Profile not found');

	const isOwner = locals.user?.id === row.profile.userId;
	// Private profiles are not exposed/tracked for non-owners.
	if (row.profile.visibility === 'private' && !isOwner) {
		return {
			private: true,
			profile: row.profile,
			discord: null,
			avatarUrl: null,
			bannerUrl: null,
			guild: null,
			cosmetics: { frameUrl: null, wallpaperUrl: null, badgeUrl: null },
			viewerTracked: false
		};
	}

	// Count unique signed-in visitors only; never store IPs or user agents.
	if (locals.user) await recordProfileView(row.profile.userId, locals.user.id);

	// Equipped cosmetics + identity files resolve in parallel.
	const [cosmetics, membership] = await Promise.all([
		getEquippedForProfile(row.profile.slug),
		getMembership(row.profile.userId)
	]);

	const [frameUrl, wallpaperUrl, badgeUrl, avatarUrl, bannerUrl] = await Promise.all([
		cosmetics.frameUrl,
		cosmetics.wallpaperUrl,
		cosmetics.badgeUrl,
		// Avatar: uploaded OVYN avatar wins, else the synced Discord avatar.
		row.profile.avatarKey
			? presignDownload(row.profile.avatarKey)
			: row.discord?.avatarUrl ?? null,
		row.profile.bannerKey ? presignDownload(row.profile.bannerKey) : null
	]);

	const guild = membership ? await getGuildById(membership.guild.id) : null;

	return {
		private: false,
		profile: row.profile,
		discord: row.discord,
		avatarUrl,
		bannerUrl,
		guild,
		cosmetics: { frameUrl, wallpaperUrl, badgeUrl },
		viewerTracked: Boolean(locals.user && !isOwner)
	};
};