import { count, eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { guildMembers, guilds, profiles } from '#lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [[g], [m], [p]] = await Promise.all([
		db.select({ total: count() }).from(guilds).where(eq(guilds.status, 'active')),
		db.select({ total: count() }).from(guildMembers),
		db.select({ total: count() }).from(profiles)
	]);

	return { stats: { guilds: g?.total ?? 0, members: m?.total ?? 0, profiles: p?.total ?? 0 } };
};
