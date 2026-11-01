import { and, asc, desc, eq, gt, sql } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { discordAccounts, guilds, profiles, products, spotlights } from '#lib/server/db/schema';
import { presignDownload } from '#lib/server/storage';

/** Public featured profiles (active paid spotlights only). */
export async function listFeaturedProfiles(limit = 6) {
	const rows = await db
		.select({
			profile: profiles,
			discord: discordAccounts,
			spotlightExpiresAt: spotlights.expiresAt
		})
		.from(spotlights)
		.innerJoin(profiles, and(eq(profiles.userId, spotlights.targetId), eq(profiles.visibility, 'public')))
		.leftJoin(discordAccounts, eq(discordAccounts.userId, profiles.userId))
		.where(and(eq(spotlights.targetType, 'profile'), gt(spotlights.expiresAt, new Date())))
		.orderBy(desc(spotlights.createdAt))
		.limit(limit);

	return Promise.all(rows.map(async (row) => ({
		...row,
		avatarUrl: row.profile.avatarKey
			? await presignDownload(row.profile.avatarKey)
			: row.discord?.avatarUrl ?? null
	})));
}

/** Active spotlight target IDs, for marking guild cards in discovery. */
export async function listFeaturedGuildIds(): Promise<Set<string>> {
	const rows = await db
		.select({ targetId: spotlights.targetId })
		.from(spotlights)
		.innerJoin(guilds, and(eq(guilds.id, sql`${spotlights.targetId}::uuid`), eq(guilds.status, 'active')))
		.where(and(eq(spotlights.targetType, 'guild'), gt(spotlights.expiresAt, new Date())));
	return new Set(rows.map((r) => r.targetId));
}

export async function listSpotlightProducts(targetType: 'profile' | 'guild') {
	const category = targetType === 'profile' ? 'profile_spotlight' : 'guild_spotlight';
	return db
		.select()
		.from(products)
		.where(and(eq(products.active, true), eq(products.category, category)))
		.orderBy(asc(products.price));
}
