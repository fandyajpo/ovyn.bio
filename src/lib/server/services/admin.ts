import { randomUUID } from 'node:crypto';
import { and, count, desc, eq, gte, isNotNull, sql } from 'drizzle-orm';
import { OVYN_ADMIN_DISCORD_IDS, OVYN_ADMIN_EMAILS } from '$app/env/private';
import { db } from '#lib/server/db';
import { cosmetics, discordAccounts, orders, payments, products, profiles, user } from '#lib/server/db/schema';
import { ConflictError, isUniqueViolation, NotFoundError, ValidationError } from '#lib/server/utils/errors';
import type { AdminCreateProduct, AdminUpdateProduct } from '#lib/schemas/admin';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


function configuredAdminDiscordIds(): Set<string> {
	return new Set(
		(OVYN_ADMIN_DISCORD_IDS ?? '')
			.split(',')
			.map((id) => id.trim())
			.filter((id) => /^\d{17,20}$/.test(id))
	);
}

function configuredAdminEmails(): Set<string> {
	return new Set(
		(OVYN_ADMIN_EMAILS ?? '')
			.split(',')
			.map((email) => email.trim().toLowerCase())
			.filter((email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
	);
}

/**
 * Admin access comes from the server-verified Discord ID or account email, so
 * Discord and Google sign-in both work. Client input is never trusted.
 */
export async function isPlatformAdmin(userId: string | null): Promise<boolean> {
	if (!userId) return false;
	const allowedIds = configuredAdminDiscordIds();
	const allowedEmails = configuredAdminEmails();
	if (allowedIds.size === 0 && allowedEmails.size === 0) return false;

	const [account] = await db
		.select({ discordId: discordAccounts.discordId, email: user.email })
		.from(user)
		.leftJoin(discordAccounts, eq(discordAccounts.userId, user.id))
		.where(eq(user.id, userId))
		.limit(1);

	if (!account) return false;
	if (account.discordId && allowedIds.has(account.discordId)) return true;
	return Boolean(account.email && allowedEmails.has(account.email.toLowerCase()));
}

export async function getAdminOverview() {
	const [productRows, activeProductRows, orderRows, pendingPaymentRows, paidPaymentRows, revenueRows, recentOrders] = await Promise.all([
		db.select({ total: count() }).from(products),
		db.select({ total: count() }).from(products).where(eq(products.active, true)),
		db.select({ total: count() }).from(orders),
		db.select({ total: count() }).from(payments).where(eq(payments.status, 'pending')),
		db.select({ total: count() }).from(payments).where(eq(payments.status, 'succeeded')),
		db
			.select({ total: sql<number>`coalesce(sum(${orders.amount}), 0)`.mapWith(Number) })
			.from(orders)
			.innerJoin(payments, eq(payments.orderId, orders.id))
			.where(eq(payments.status, 'succeeded')),
		listAdminOrders(8)
	]);

	return {
		products: Number(productRows[0]?.total ?? 0),
		activeProducts: Number(activeProductRows[0]?.total ?? 0),
		orders: Number(orderRows[0]?.total ?? 0),
		pendingPayments: Number(pendingPaymentRows[0]?.total ?? 0),
		paidOrders: Number(paidPaymentRows[0]?.total ?? 0),
		paidRevenue: Number(revenueRows[0]?.total ?? 0),
		recentOrders
	};
}

export async function getSalesAnalytics(days = 30) {
	const dayCount = Math.max(1, Math.min(Math.floor(days), 365));
	const firstDay = new Date();
	firstDay.setUTCHours(0, 0, 0, 0);
	firstDay.setUTCDate(firstDay.getUTCDate() - (dayCount - 1));

	const dateExpression = sql`to_char(${payments.paidAt} at time zone 'UTC', 'YYYY-MM-DD')`;
	const rows = await db
		.select({
			date: sql<string>`to_char(${payments.paidAt} at time zone 'UTC', 'YYYY-MM-DD')`,
			orders: count(),
			revenue: sql<number>`coalesce(sum(${orders.amount}), 0)`.mapWith(Number)
		})
		.from(payments)
		.innerJoin(orders, eq(orders.id, payments.orderId))
		.where(and(eq(payments.status, 'succeeded'), isNotNull(payments.paidAt), gte(payments.paidAt, firstDay)))
		.groupBy(dateExpression)
		.orderBy(dateExpression);

	const rowsByDate = new Map(rows.map((row) => [row.date, row]));
	const daily = Array.from({ length: dayCount }, (_, index) => {
		const date = new Date(firstDay);
		date.setUTCDate(firstDay.getUTCDate() + index);
		const key = date.toISOString().slice(0, 10);
		const row = rowsByDate.get(key);
		return { date: key, orders: Number(row?.orders ?? 0), revenue: Number(row?.revenue ?? 0) };
	});
	const totalOrders = daily.reduce((total, day) => total + day.orders, 0);
	const totalRevenue = daily.reduce((total, day) => total + day.revenue, 0);

	return {
		daily,
		totalOrders,
		totalRevenue,
		averageOrderValue: totalOrders ? Math.round(totalRevenue / totalOrders) : 0
	};
}

export async function listAdminProducts() {
	return db
		.select({ product: products, cosmetic: cosmetics })
		.from(products)
		.leftJoin(cosmetics, eq(cosmetics.id, products.id))
		.orderBy(desc(products.createdAt));
}

/** A single catalog product with its cosmetic details, or null when absent. */
export async function getAdminProduct(id: string) {
	if (!UUID_PATTERN.test(id)) return null;
	const [row] = await db
		.select({ product: products, cosmetic: cosmetics })
		.from(products)
		.leftJoin(cosmetics, eq(cosmetics.id, products.id))
		.where(eq(products.id, id))
		.limit(1);
	return row ?? null;
}

export async function listAdminOrders(limit = 50) {
	return db
		.select({
			orderId: orders.id,
			orderStatus: orders.status,
			amount: orders.amount,
			currency: orders.currency,
			createdAt: orders.createdAt,
			productName: products.name,
			productCategory: products.category,
			paymentStatus: payments.status,
			paymentMethod: payments.paymentMethod,
			paidAt: payments.paidAt,
			customerSlug: profiles.slug
		})
		.from(orders)
		.innerJoin(products, eq(products.id, orders.productId))
		.leftJoin(payments, eq(payments.orderId, orders.id))
		.leftJoin(profiles, eq(profiles.userId, orders.userId))
		.orderBy(desc(orders.createdAt))
		.limit(limit);
}

function requireCosmeticFields(input: AdminCreateProduct | AdminUpdateProduct) {
	if (!input.kind) throw new ValidationError('Choose a cosmetic type');
	if (!input.assetKey?.startsWith('cosmetics/') && !input.assetKey?.startsWith('static/cosmetics/')) {
		throw new ValidationError('Upload an image for this cosmetic');
	}
}

export async function createCatalogProduct(input: AdminCreateProduct): Promise<void> {
	const id = randomUUID();
	if (input.category === 'cosmetic') {
		requireCosmeticFields(input);
		if (input.price === 0 && input.pointsPrice === null) {
			throw new ValidationError('A free cosmetic needs a points price (use 0 for free)');
		}
	} else {
		if (input.price !== 30_000) throw new ValidationError('Premium costs Rp 30.000 per month');
		if (input.durationDays !== 30) throw new ValidationError('Premium is billed in 30-day months');
	}

	try {
		await db.transaction(async (tx) => {
			await tx.insert(products).values({
				id,
				name: input.name,
				description: input.description,
				price: input.price,
				currency: 'IDR',
				active: input.active,
				category: input.category,
				durationDays: input.category === 'cosmetic' ? null : input.durationDays
			});

			if (input.category === 'cosmetic') {
				await tx.insert(cosmetics).values({
					id,
					kind: input.kind!,
					assetKey: input.assetKey!,
					accentColor: input.accentColor,
					pointsPrice: input.pointsPrice,
					stockLimit: input.stockLimit,
					dropEndsAt: input.dropEndsAt
				});
			}
		});
	} catch (err) {
		if (isUniqueViolation(err)) throw new ConflictError('A product with that name already exists');
		throw err;
	}
}

export async function updateCatalogProduct(input: AdminUpdateProduct): Promise<void> {
	try {
		await db.transaction(async (tx) => {
			const [product] = await tx
				.select()
				.from(products)
				.where(eq(products.id, input.id))
				.for('update')
				.limit(1);
			if (!product) throw new NotFoundError('Product not found');
			if (product.category === 'cosmetic') {
				requireCosmeticFields(input);
				if (input.price === 0 && input.pointsPrice === null) {
					throw new ValidationError('A free cosmetic needs a points price (use 0 for free)');
				}
				const [cosmetic] = await tx
					.select({ id: cosmetics.id })
					.from(cosmetics)
					.where(eq(cosmetics.id, product.id))
					.for('update')
					.limit(1);
				if (!cosmetic) throw new ConflictError('The cosmetic record is missing');
			} else if (product.category === 'plan') {
				if (input.price !== 30_000 || input.durationDays !== 30) {
					throw new ValidationError('Premium costs Rp 30.000 for 30 days');
				}
			}

			await tx
				.update(products)
				.set({
					name: input.name,
					description: input.description,
					price: input.price,
					currency: 'IDR',
					active: input.active,
					durationDays: product.category === 'cosmetic' ? null : input.durationDays,
					updatedAt: new Date()
				})
				.where(eq(products.id, product.id));

			if (product.category === 'cosmetic') {
				await tx
					.update(cosmetics)
					.set({
						kind: input.kind!,
						assetKey: input.assetKey!,
						accentColor: input.accentColor,
						pointsPrice: input.pointsPrice,
						stockLimit: input.stockLimit,
						dropEndsAt: input.dropEndsAt,
						updatedAt: new Date()
					})
					.where(eq(cosmetics.id, product.id));
			}
		});
	} catch (err) {
		if (isUniqueViolation(err)) throw new ConflictError('A product with that name already exists');
		throw err;
	}
}
