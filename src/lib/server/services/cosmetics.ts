import { and, asc, count, eq, gte, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '#lib/server/db';
import {
	cosmetics,
	orders,
	profiles,
	products,
	userCosmetics,
	userRewards
} from '#lib/server/db/schema';
import { ForbiddenError, NotFoundError, ValidationError, ConflictError } from '#lib/server/utils/errors';
import { presignDownload } from '#lib/server/storage';

const frameCosmetic = alias(cosmetics, 'frame_cosmetic');
const wallpaperCosmetic = alias(cosmetics, 'wallpaper_cosmetic');
const badgeCosmetic = alias(cosmetics, 'badge_cosmetic');
const PENDING_RESERVATION_MS = 24 * 60 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CosmeticKind = 'frame' | 'wallpaper' | 'badge';

async function cosmeticAssetUrl(key: string): Promise<string> {
	if (key.startsWith('static/cosmetics/')) return `/${key.slice('static/'.length)}`;
	return presignDownload(key);
}

async function inventory(cosmeticId: string) {
	const [owned] = await db
		.select({ total: count() })
		.from(userCosmetics)
		.where(eq(userCosmetics.cosmeticId, cosmeticId));
	const [pending] = await db
		.select({ total: count() })
		.from(orders)
		.where(
			and(
				eq(orders.productId, cosmeticId),
				eq(orders.status, 'pending'),
				gte(orders.createdAt, new Date(Date.now() - PENDING_RESERVATION_MS))
			)
		);
	return Number(owned?.total ?? 0) + Number(pending?.total ?? 0);
}

/** Shop catalog includes real remaining inventory and the viewer's points. */
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
			accentColor: cosmetics.accentColor,
			pointsPrice: cosmetics.pointsPrice,
			stockLimit: cosmetics.stockLimit,
			dropEndsAt: cosmetics.dropEndsAt
		})
		.from(cosmetics)
		.innerJoin(products, eq(products.id, cosmetics.id))
		.where(and(eq(products.active, true), eq(products.category, 'cosmetic')))
		.orderBy(asc(products.price));

	let ownedIds = new Set<string>();
	let points = 0;
	let equipped: { frame: string | null; wallpaper: string | null; badge: string | null } | undefined;

	if (userId) {
		const [ownedRows, [rewardsRow], [profile]] = await Promise.all([
			db.select({ cosmeticId: userCosmetics.cosmeticId }).from(userCosmetics).where(eq(userCosmetics.userId, userId)),
			db.select({ points: userRewards.points }).from(userRewards).where(eq(userRewards.userId, userId)).limit(1),
			db.select({ frame: profiles.equippedFrameId, wallpaper: profiles.equippedWallpaperId, badge: profiles.equippedBadgeId })
				.from(profiles).where(eq(profiles.userId, userId)).limit(1)
		]);
		ownedIds = new Set(ownedRows.map((o) => o.cosmeticId));
		points = rewardsRow?.points ?? 0;
		equipped = profile;
	}

	return Promise.all(items.map(async (item) => {
		const reserved = item.stockLimit === null ? 0 : await inventory(item.id);
		return {
			...item,
			owned: ownedIds.has(item.id),
			equipped:
				(item.kind === 'frame' && equipped?.frame === item.id) ||
				(item.kind === 'wallpaper' && equipped?.wallpaper === item.id) ||
				(item.kind === 'badge' && equipped?.badge === item.id),
			points,
			remainingStock: item.stockLimit === null ? null : Math.max(0, item.stockLimit - reserved),
			dropOpen: !item.dropEndsAt || item.dropEndsAt.getTime() > Date.now(),
			assetUrl: item.assetKey ? await cosmeticAssetUrl(item.assetKey) : null
		};
	}));
}

/** Cosmetics the user owns, grouped by kind, for the equip UI. */
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

/** Equip (cosmeticId) or unequip (null) a cosmetic in the slot for its kind. */
export async function setEquippedCosmetic(
	userId: string,
	kind: CosmeticKind,
	cosmeticId: string | null
) {
	if (cosmeticId && !UUID_PATTERN.test(cosmeticId)) throw new ValidationError('Invalid cosmetic');
	if (cosmeticId) {
		const [owned] = await db
			.select()
			.from(userCosmetics)
			.where(and(eq(userCosmetics.userId, userId), eq(userCosmetics.cosmeticId, cosmeticId)))
			.limit(1);
		if (!owned) throw new ForbiddenError('You do not own this cosmetic');

		const [cosmetic] = await db.select().from(cosmetics).where(eq(cosmetics.id, cosmeticId)).limit(1);
		if (!cosmetic || cosmetic.kind !== kind) throw new ValidationError('Cosmetic kind mismatch');
	}

	const values = {
		frame: { equippedFrameId: cosmeticId },
		wallpaper: { equippedWallpaperId: cosmeticId },
		badge: { equippedBadgeId: cosmeticId }
	}[kind];

	const [updated] = await db
		.update(profiles)
		.set({ ...values, updatedAt: new Date() })
		.where(eq(profiles.userId, userId))
		.returning({ id: profiles.id });
	if (!updated) throw new NotFoundError('Profile not found');
}

/** Redeem a cosmetic with earned points; debit and ownership grant are atomic. */
export async function redeemCosmeticWithPoints(userId: string, cosmeticId: string) {
	if (!UUID_PATTERN.test(cosmeticId)) throw new NotFoundError('Item is not available');
	await db.transaction(async (tx) => {
		await tx.execute(sql`SELECT id FROM "user" WHERE id = ${userId} FOR UPDATE`);
		await tx.execute(sql`SELECT id FROM cosmetics WHERE id = ${cosmeticId} FOR UPDATE`);
		await tx.execute(sql`
			UPDATE payments AS p
			SET status = 'expired', updated_at = now()
			FROM orders AS o
			WHERE p.order_id = o.id AND o.user_id = ${userId}
				AND o.status = 'pending' AND o.created_at <= now() - interval '24 hours'
				AND p.status = 'pending'
		`);
		await tx.execute(sql`
			UPDATE orders SET status = 'expired', updated_at = now()
			WHERE user_id = ${userId} AND status = 'pending'
				AND created_at <= now() - interval '24 hours'
		`);
		const [pendingOrder] = await tx
			.select({ id: orders.id })
			.from(orders)
			.where(
				and(
					eq(orders.userId, userId),
					eq(orders.productId, cosmeticId),
					eq(orders.status, 'pending')
				)
			)
			.limit(1);
		if (pendingOrder) throw new ConflictError('You already have a pending payment for this cosmetic');

		const [item] = await tx
			.select({
				pointsPrice: cosmetics.pointsPrice,
				stockLimit: cosmetics.stockLimit,
				dropEndsAt: cosmetics.dropEndsAt,
				active: products.active,
				category: products.category
			})
			.from(cosmetics)
			.innerJoin(products, eq(products.id, cosmetics.id))
			.where(eq(cosmetics.id, cosmeticId))
			.limit(1);
		if (!item || !item.active || item.category !== 'cosmetic') throw new NotFoundError('Item is not available');
		if (item.pointsPrice === null) throw new ValidationError('This item cannot be redeemed with points');
		if (item.dropEndsAt && item.dropEndsAt.getTime() <= Date.now()) throw new ConflictError('This drop has ended');

		const [alreadyOwned] = await tx
			.select({ cosmeticId: userCosmetics.cosmeticId })
			.from(userCosmetics)
			.where(and(eq(userCosmetics.userId, userId), eq(userCosmetics.cosmeticId, cosmeticId)))
			.limit(1);
		if (alreadyOwned) throw new ConflictError('You already own this item');

		if (item.stockLimit !== null) {
			const [inventoryRow] = await tx.execute(sql`
				SELECT
					(SELECT count(*) FROM user_cosmetics WHERE cosmetic_id = ${cosmeticId}) +
					(SELECT count(*) FROM orders WHERE product_id = ${cosmeticId} AND status = 'pending'
					 AND created_at > now() - interval '24 hours') AS reserved
			`);
			if (Number(inventoryRow?.reserved ?? 0) >= item.stockLimit) throw new ConflictError('This limited drop is sold out');
		}

		await tx.insert(userRewards).values({ userId }).onConflictDoNothing();
		const [balance] = await tx
			.update(userRewards)
			.set({ points: sql`${userRewards.points} - ${item.pointsPrice}`, updatedAt: new Date() })
			.where(and(eq(userRewards.userId, userId), gte(userRewards.points, item.pointsPrice)))
			.returning({ points: userRewards.points });
		if (!balance) throw new ConflictError('Not enough points');

		await tx.insert(userCosmetics).values({ userId, cosmeticId }).onConflictDoNothing();
	});
}

/** Equipped cosmetics for a profile (by slug), with resolved asset URLs. */
export async function getEquippedForProfile(slug: string) {
	const [row] = await db
		.select({
			frameKey: frameCosmetic.assetKey,
			wallpaperKey: wallpaperCosmetic.assetKey,
			badgeKey: badgeCosmetic.assetKey
		})
		.from(profiles)
		.leftJoin(frameCosmetic, eq(profiles.equippedFrameId, frameCosmetic.id))
		.leftJoin(wallpaperCosmetic, eq(profiles.equippedWallpaperId, wallpaperCosmetic.id))
		.leftJoin(badgeCosmetic, eq(profiles.equippedBadgeId, badgeCosmetic.id))
		.where(eq(profiles.slug, slug))
		.limit(1);

	if (!row) return { frameUrl: null, wallpaperUrl: null, badgeUrl: null };
	const [frameUrl, wallpaperUrl, badgeUrl] = await Promise.all([
		row.frameKey ? cosmeticAssetUrl(row.frameKey) : null,
		row.wallpaperKey ? cosmeticAssetUrl(row.wallpaperKey) : null,
		row.badgeKey ? cosmeticAssetUrl(row.badgeKey) : null
	]);
	return { frameUrl, wallpaperUrl, badgeUrl };
}
