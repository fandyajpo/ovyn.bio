import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getGuildBySlug, listGuildMembers } from '#lib/server/services/guilds';
import { presignDownload } from '#lib/server/storage';

export const load: PageServerLoad = async ({ params }) => {
	const guild = await getGuildBySlug(params.slug);
	if (!guild) error(404, 'Guild not found');

	const disbanded = guild.status !== 'active';
	const members = disbanded ? [] : await listGuildMembers(guild.id);

	const [bannerUrl, iconUrl] = await Promise.all([
		guild.bannerKey ? presignDownload(guild.bannerKey) : null,
		guild.iconKey ? presignDownload(guild.iconKey) : null
	]);

	return { guild, disbanded, members, bannerUrl, iconUrl };
};
