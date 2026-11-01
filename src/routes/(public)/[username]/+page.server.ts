import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getProfileBySlug } from '$lib/server/services/profiles';
import { getGuildById, getMembership } from '$lib/server/services/guilds';
import { presignDownload } from '$lib/server/storage';

export const load: PageServerLoad = async ({ params, locals }) => {
	const row = await getProfileBySlug(params.username);
	if (!row) error(404, 'Profile not found');

	const isOwner = locals.user?.id === row.profile.userId;
	if (row.profile.visibility === 'private' && !isOwner) {
		return { private: true, profile: row.profile, discord: null, avatarUrl: null, bannerUrl: null, guild: null };
	}

	const [avatarUrl, bannerUrl, membership] = await Promise.all([
		row.profile.avatarKey
			? presignDownload(row.profile.avatarKey)
			: row.discord?.avatarUrl ?? null,
		row.profile.bannerKey ? presignDownload(row.profile.bannerKey) : null,
		getMembership(row.profile.userId)
	]);

	const guild = membership ? await getGuildById(membership.guild.id) : null;

	return {
		private: false,
		profile: row.profile,
		discord: row.discord,
		avatarUrl,
		bannerUrl,
		guild
	};
};
