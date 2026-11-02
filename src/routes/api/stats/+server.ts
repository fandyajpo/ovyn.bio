import type { RequestHandler } from './$types';
import { count, eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { guildMembers, guilds, profiles } from '#lib/server/db/schema';

type Stats = { guilds: number; members: number; profiles: number };

const STATS_TTL_MS = 60_000;

let cachedStats: { stats: Stats; expiresAt: number } | null = null;

/**
 * The landing page is prerendered, so its community counters are read once the
 * page is in the browser. They only need to be fresh to the minute.
 */
async function loadStats(): Promise<Stats> {
	const now = Date.now();
	if (cachedStats && cachedStats.expiresAt > now) return cachedStats.stats;

	const [[g], [m], [p]] = await Promise.all([
		db.select({ total: count() }).from(guilds).where(eq(guilds.status, 'active')),
		db.select({ total: count() }).from(guildMembers),
		db.select({ total: count() }).from(profiles)
	]);

	const stats = { guilds: g?.total ?? 0, members: m?.total ?? 0, profiles: p?.total ?? 0 };
	cachedStats = { stats, expiresAt: now + STATS_TTL_MS };
	return stats;
}

export const GET: RequestHandler = async () => {
	const stats = await loadStats();
	return Response.json(stats, {
		headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
	});
};
