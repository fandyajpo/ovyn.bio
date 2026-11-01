import { and, asc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '#lib/server/db';
import { cosmetics, profiles, products, userCosmetics } from '#lib/server/db/schema';
import { ForbiddenError, ValidationError } from '#lib/server/utils/errors';
import { presignDownload } from '#lib/server/storage';

// Aliased joins so one query can fetch all three equipped cosmetics.
const frameCosmetic = alias(cosmetics, 'frame_cosmetic');
const wallpaperCosmetic = alias(cosmetics, 'wallpaper_cosmetic');
const badgeCosmetic = alias(cosmetics, 'badge_cosmetic');

export type CosmeticKind = 'frame' | 'wallpaper' | 'badge';

/**
 * The shop catalog: every active cosmetic with its product price,
 * plus ownership + equip status for the viewer (when signed in).
 */
export async function listShop(userId: string | null) {
	const items = await db
		.select({
			id: cosmetics.id,
			name: products.name,
			description: products.description,
			kind: cosmetics.kind,
			price: products.price,
			currency: products.currency,
			assetKey: cosmetics.assetKey,
			accentColor: cosmetics.accentColor
		})
		.from(cosmetics)
		.innerJoin(products, eq(products.id, cosmetics.id))
		.where(eq(products.active, true))
		.orderBy(asc(products.price));

	if (!userId) {
		return items.map((i) => ({ ...i, owned: false, equipped: false, assetUrl: null as string | null }));
	}

	const owned = await db
		.select({ cosmeticId: userCosmetics.cosmeticId })
		.from(userCosmetics)
		.where(eq(userCosmetics.userId, userId));
	const ownedIds = new Set(owned.map((o) => o.cosmeticId));

	const [profile] = await db
		.select({
			frame: profiles.equippedFrameId,
			wallpaper: profiles.equippedWallpaperId,
			badge: profiles.equippedBadgeId
		})
		.from(profiles)
		.where(eq(profiles.userId, userId))
		.limit(1);

	const assetUrls = await Promise.all(
		items.map((i) => (i.assetKey ? presignDownload(i.assetKey) : null))
	);

	return items.map((i, idx) => ({
		...i,
		owned: ownedIds.has(i.id),
		equipped:
			(i.kind === 'frame' && profile?.frame === i.id) ||
			(i.kind === 'wallpaper' && profile?.wallpaper === i.id) ||
			(i.kind === 'badge' && profile?.badge === i.id),
		assetUrl: assetUrls[idx]
	}));
}

/** Cosmetics the user owns, grouped by kind, for the settings equip UI. */
export async function listOwnedByKind(userId: string) {
	const rows = await db
		.select({
			id: cosmetics.id,
			name: products.name,
			kind: cosmetics.kind,
			assetKey: cosmetics.assetKey,
			accentColor: cosmetics.accentColor
		})
		.from(userCosmetics)
		.innerJoin(cosmetics, eq(cosmetics.id, userCosmetics.cosmeticId))
		.innerJoin(products, eq(products.id, cosmetics.id))
		.where(eq(userCosmetics.userId, userId))
		.orderBy(asc(products.name));

	return {
		frames: rows.filter((r) => r.kind === 'frame'),
		wallpapers: rows.filter((r) => r.kind === 'wallpaper'),
		badges: rows.filter((r) => r.kind === 'badge')
	};
}

/**
 * Equip (cosmeticId) or unequip (null) a cosmetic in the slot for its kind.
 * Verifies ownership and that the cosmetic's kind matches the slot.
 */
export async function setEquippedCosmetic(
	userId: string,
	kind: CosmeticKind,
	cosmeticId: string | null
) {
	if (!cosmeticId) {
		// Unequip: null out the slot for this kind.
		switch (kind) {
			case 'frame':
				await db.update(profiles).set({ equippedFrameId: null, updatedAt: new Date() }).where(eq(profiles.userId, userId));
				return;
			case 'wallpaper':
				await db.update(profiles).set({ equippedWallpaperId: null, updatedAt: new Date() }).where(eq(profiles.userId, userId));
				return;
			case 'badge':
				await db.update(profiles).set({ equippedBadgeId: null, updatedAt: new Date() }).where(eq(profiles.userId, userId));
				return;
		}
	}

	const [owned] = await db
		.select()
		.from(userCosmetics)
		.where(and(eq(userCosmetics.userId, userId), eq(userCosmetics.cosmeticId, cosmeticId)))
		.limit(1);
	if (!owned) throw new ForbiddenError('You do not own this cosmetic');

	const [cosmetic] = await db.select().from(cosmetics).where(eq(cosmetics.id, cosmeticId)).limit(1);
	if (!cosmetic || cosmetic.kind !== kind) throw new ValidationError('Cosmetic kind mismatch');

	switch (kind) {
		case 'frame':
			await db.update(profiles).set({ equippedFrameId: cosmeticId, updatedAt: new Date() }).where(eq(profiles.userId, userId));
			break;
		case 'wallpaper':
			await db.update(profiles).set({ equippedWallpaperId: cosmeticId, updatedAt: new Date() }).where(eq(profiles.userId, userId));
			break;
		case 'badge':
			await db.update(profiles).set({ equippedBadgeId: cosmeticId, updatedAt: new Date() }).where(eq(profiles.userId, userId));
			break;
	}
}

/** Equipped cosmetics for a profile (by slug), with presigned asset URLs. */
export async function getEquippedForProfile(slug: string) {
	const [row] = await db
		.select({
			frameKey: frameCosmetic.assetKey,
			wallpaperKey: wallpaperCosmetic.assetKey,
			badgeKey: badgeCosmetic.assetKey
		})
		.from(profiles)
		.leftJoin(cosmetics, eq(profiles.equippedFrameId, cosmetics.id))
		.leftJoin(
			wallpaperCosmetic,
			eq(profiles.equippedWallpaperId, wallpaperCosmetic.id)
		)
		.leftJoin(badgeCosmetic, eq(profiles.equippedBadgeId, badgeCosmetic.id))
		.where(eq(profiles.slug, slug))
		.limit(1);

	if (!row) return { frameUrl: null, wallpaperUrl: null, badgeUrl: null };

	const [frameUrl, wallpaperUrl, badgeUrl] = await Promise.all([
		row.frameKey ? presignDownload(row.frameKey) : null,
		row.wallpaperKey ? presignDownload(row.wallpaperKey) : null,
		row.badgeKey ? presignDownload(row.badgeKey) : null
	]);

	return { frameUrl, wallpaperUrl, badgeUrl };
}
