import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getProfileBySlug } from '#lib/server/services/profiles';
import { listProfileLinks } from '#lib/server/services/profile-content';
import { getMembership } from '#lib/server/services/guilds';
import { getEquippedForProfile } from '#lib/server/services/cosmetics';
import { recordProfileView } from '#lib/server/services/engagement';
import { presignDownload } from '#lib/server/storage';
import { getUserPlan } from '#lib/server/services/billing';
import { runInBackground } from '#lib/server/utils/background';

export const load: PageServerLoad = async (event) => {
	const { params, locals } = event;
	const row = await getProfileBySlug(params.username);
	if (!row) error(404, 'Profile not found');

	const isOwner = locals.user?.id === row.profile.userId;
	const safeProfile = {
		slug: row.profile.slug,
		displayName: row.profile.displayName,
		bio: row.profile.bio,
		theme: row.profile.theme,
		usernameColor: row.profile.usernameColor,
		backgroundTexture: row.profile.backgroundTexture,
		backgroundFixed: row.profile.backgroundFixed,
		visibility: row.profile.visibility,
		blocks: row.profile.blocks ?? [],
		createdAt: row.profile.createdAt
	};
	const bannerIsVideo = /\.(mp4|webm)$/i.test(row.profile.bannerKey ?? '');
	const bannerVideoType = row.profile.bannerKey?.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4';
	const backgroundIsVideo = /\.(mp4|webm)$/i.test(row.profile.backgroundKey ?? '');
	const backgroundVideoType = row.profile.backgroundKey?.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4';

	// Private profiles are not exposed/tracked for non-owners.
	if (row.profile.visibility === 'private' && !isOwner) {
		return {
			private: true,
			profile: { ...safeProfile, displayName: null, bio: null, theme: 'default', usernameColor: null, backgroundTexture: 'none', blocks: [] },
			discord: null,
			avatarUrl: null,
			bannerUrl: null,
			bannerIsVideo: false,
			bannerVideoType: 'video/mp4',
			backgroundUrl: null,
			backgroundIsVideo: false,
			backgroundVideoType: 'video/mp4',
			audioUrl: null,
			cursorUrl: null,
			links: [],
			guild: null,
			cosmetics: { frameUrl: null, wallpaperUrl: null, badgeUrl: null },
			isPremium: false,
			viewerTracked: false
		};
	}

	// Count unique signed-in visitors only; never store IPs or user agents. The
	// counter runs after the response so it never slows down the page.
	if (locals.user) void runInBackground(event, recordProfileView(row.profile.userId, locals.user.id));

	// Equipped cosmetics + identity files resolve in parallel.
	const [cosmetics, membership, links, plan] = await Promise.all([
		getEquippedForProfile(row.profile.slug),
		getMembership(row.profile.userId),
		listProfileLinks(row.profile.userId),
		getUserPlan(row.profile.userId)
	]);

	const [frameUrl, wallpaperUrl, badgeUrl, avatarUrl, bannerUrl, audioUrl, cursorUrl, backgroundUrl] = await Promise.all([
		cosmetics.frameUrl,
		cosmetics.wallpaperUrl,
		cosmetics.badgeUrl,
		// Avatar: uploaded ovyn avatar wins, else the synced Discord avatar.
		row.profile.avatarKey
			? presignDownload(row.profile.avatarKey)
			: row.discord?.avatarUrl ?? row.authUser.image ?? null,
		row.profile.bannerKey ? presignDownload(row.profile.bannerKey) : null,
		row.profile.audioKey ? presignDownload(row.profile.audioKey) : null,
		row.profile.cursorKey && plan.tier === 'premium' ? presignDownload(row.profile.cursorKey) : null,
		row.profile.backgroundKey ? presignDownload(row.profile.backgroundKey) : null
	]);

	// The membership row already carries the circle, so no extra query is needed.
	const guild = membership?.guild ?? null;

	return {
		private: false,
		profile: safeProfile,
		discord: row.discord ? { username: row.discord.username, globalName: row.discord.globalName } : null,
		avatarUrl,
		bannerUrl,
		bannerIsVideo,
		bannerVideoType,
		backgroundUrl,
		backgroundIsVideo,
		backgroundVideoType,
		audioUrl,
		cursorUrl,
		links,
		guild,
		cosmetics: { frameUrl, wallpaperUrl, badgeUrl },
		isPremium: plan.tier === 'premium',
		viewerTracked: Boolean(locals.user && !isOwner)
	};
};