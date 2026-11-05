import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { countGuildMembers, getGuildBySlug, listPublicGuildMembers } from '#lib/server/services/guilds';
import { presignDownload } from '#lib/server/storage';

export const load: PageServerLoad = async ({ params }) => {
	const guild = await getGuildBySlug(params.slug);
	if (!guild) error(404, 'Circle not found');

	const disbanded = guild.status !== 'active';
	// Public pages only list members whose own profile is public (GL-4):
	// private profiles keep their identity, avatar and Discord handle hidden.
	const members = disbanded ? [] : await listPublicGuildMembers(guild.id);
	const memberCount = disbanded ? 0 : await countGuildMembers(guild.id);

	const [bannerUrl, iconUrl] = await Promise.all([
		guild.bannerKey ? presignDownload(guild.bannerKey) : null,
		guild.iconKey ? presignDownload(guild.iconKey) : null
	]);

	return { guild, disbanded, members, memberCount, bannerUrl, iconUrl };
};