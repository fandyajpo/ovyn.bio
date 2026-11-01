import { count, eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { guildMembers, guilds, profiles } from '#lib/server/db/schema';
import { listFeaturedProfiles } from '#lib/server/services/spotlights';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [[g], [m], [p], featuredProfiles] = await Promise.all([
		db.select({ total: count() }).from(guilds).where(eq(guilds.status, 'active')),
		db.select({ total: count() }).from(guildMembers),
		db.select({ total: count() }).from(profiles),
		listFeaturedProfiles(6)
	]);

	return {
		stats: { guilds: g.total, members: m.total, profiles: p.total },
		featuredProfiles
	};
};
