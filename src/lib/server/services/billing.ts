import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '#lib/server/db';
import {
	cosmetics,
	orders,
	paymentEvents,
	payments,
	products,
	userCosmetics
} from '#lib/server/db/schema';
import { profiles } from '#lib/server/db/schema';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '#lib/server/utils/errors';
import { dokuTimestamp } from '#lib/server/payments/doku/signature';
import {
	checkVirtualAccountStatus,
	createVirtualAccount,
	type SnapChannel
} from '#lib/server/payments/doku/client';
import type { TransactionFn } from './types';

type Tx = Parameters<TransactionFn>[0];

const PAYMENT_CHANNEL: SnapChannel = 'VIRTUAL_ACCOUNT_BCA';
/** DOKU recommends hitting Check Status ~60s after payment completion. */
const VA_TTL_MINUTES = 60 * 24;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Order + payment creation
// ---------------------------------------------------------------------------

/** Create an order using a server-controlled product price. */
export async function createCheckout(userId: string, productId: string) {
	if (!UUID_PATTERN.test(productId)) throw new NotFoundError('Product not found or not available');

	const [product] = await db
		.select()
		.from(products)
		.where(and(eq(products.id, productId), eq(products.active, true)))
		.limit(1);

	if (!product) throw new NotFoundError('Product not found or not available');
	if (product.category === 'plan' && (product.price !== 100_000 || product.durationDays !== null)) {
		throw new ValidationError('Premium is a one-time Rp 100.000 lifetime plan');
	}

	const [profile] = await db
		.select({ displayName: profiles.displayName, slug: profiles.slug })
		.from(profiles)
		.where(eq(profiles.userId, userId))
		.limit(1);

	// User lock prevents parallel pending orders; product lock serializes
	// limited-drop stock reservations across different users.
	const order = await db.transaction(async (tx) => {
		await tx.execute(sql`SELECT id FROM "user" WHERE id = ${userId} FOR UPDATE`);
		await tx.execute(sql`SELECT id FROM products WHERE id = ${product.id} FOR UPDATE`);

		// Expired virtual accounts no longer reserve limited-drop stock or block
		// the buyer from creating another checkout.
		await tx.execute(sql`
			UPDATE payments AS p
			SET status = 'expired', updated_at = now()
			FROM orders AS o
			WHERE p.order_id = o.id
				AND o.user_id = ${userId}
				AND o.status = 'pending'
				AND o.created_at <= now() - interval '24 hours'
				AND p.status = 'pending'
		`);
		await tx.execute(sql`
			UPDATE orders
			SET status = 'expired', updated_at = now()
			WHERE user_id = ${userId}
				AND status = 'pending'
				AND created_at <= now() - interval '24 hours'
		`);

		const [pending] = await tx
			.select({ id: orders.id })
			.from(orders)
			.where(and(eq(orders.userId, userId), eq(orders.status, 'pending')))
			.limit(1);
		if (pending) {
			throw new ConflictError('You already have a pending payment. Complete or let it expire first.');
		}

		if (product.category === 'cosmetic') {
			// Share a lock with points redemptions so paid/points inventory
			// reservations cannot oversell the same limited drop.
			await tx.execute(sql`SELECT id FROM cosmetics WHERE id = ${product.id} FOR UPDATE`);
			const [cosmetic] = await tx
				.select()
				.from(cosmetics)
				.where(eq(cosmetics.id, product.id))
				.limit(1);
			if (!cosmetic) throw new NotFoundError('Cosmetic not found');
			if (cosmetic.dropEndsAt && cosmetic.dropEndsAt.getTime() <= Date.now()) {
				throw new ConflictError('This limited drop has ended');
			}
			const [alreadyOwned] = await tx
				.select({ cosmeticId: userCosmetics.cosmeticId })
				.from(userCosmetics)
				.where(and(eq(userCosmetics.userId, userId), eq(userCosmetics.cosmeticId, cosmetic.id)))
				.limit(1);
			if (alreadyOwned) throw new ConflictError('You already own this cosmetic');

			if (cosmetic.stockLimit !== null) {
				const [inventory] = await tx.execute(sql`
					SELECT
						(SELECT count(*) FROM user_cosmetics WHERE cosmetic_id = ${cosmetic.id}) +
						(SELECT count(*) FROM orders
						 WHERE product_id = ${product.id} AND status = 'pending'
						 AND created_at > now() - interval '24 hours') AS reserved
				`);
				if (Number(inventory?.reserved ?? 0) >= cosmetic.stockLimit) {
					throw new ConflictError('This limited drop is sold out');
				}
			}
		}

		const [created] = await tx
			.insert(orders)
			.values({
				userId,
				productId: product.id,
				amount: product.price,
				currency: product.currency
			})
			.returning();
		return created;
	});

	const expiredDate = dokuTimestamp(new Date(Date.now() + VA_TTL_MINUTES * 60_000));

	// If DOKU rejects the VA creation, fail the order instead of leaving it
	// pending - a stuck pending order would block future checkouts / drop stock.
	let va;
	try {
		va = await createVirtualAccount({
			trxId: order.id,
			amountMinor: product.price,
			currency: product.currency,
			customerName: profile?.displayName || profile?.slug || 'ovyn member',
			channel: PAYMENT_CHANNEL,
			expiredDate
		});
	} catch (err) {
		await db.update(orders).set({ status: 'failed', updatedAt: new Date() }).where(eq(orders.id, order.id));
		throw err;
	}

	await db.insert(payments).values({
		orderId: order.id,
		provider: 'doku',
		paymentMethod: PAYMENT_CHANNEL,
		paymentCode: va.virtualAccountNo,
		expiresAt: new Date(Date.now() + VA_TTL_MINUTES * 60_000)
	});

	return { order, virtualAccountNo: va.virtualAccountNo, howToPayPage: va.howToPayPage };
}



// ---------------------------------------------------------------------------
// Status handling (webhooks + check-status sync share this)
// ---------------------------------------------------------------------------

const SNAP_STATUS_TO_PAYMENT: Record<string, 'succeeded' | 'pending' | 'failed' | 'cancelled' | 'refunded'> = {
	'00': 'succeeded',
	'03': 'pending',
	'04': 'refunded',
	'05': 'cancelled',
	'06': 'failed'
};

const PAYMENT_TO_ORDER: Record<string, 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled'> = {
	pending: 'pending',
	succeeded: 'paid',
	failed: 'failed',
	expired: 'expired',
	cancelled: 'cancelled',
	refunded: 'paid'
};

type ApplyStatusInput = {
	orderId: string;
	paymentStatus: keyof typeof PAYMENT_TO_ORDER;
	providerTransactionId?: string | null;
	paidAt?: Date | null;
};

/** Idempotently apply status + fulfil purchased items inside the same transaction. */
async function applyStatus(tx: Tx, input: ApplyStatusInput): Promise<'applied' | 'ignored'> {
	const [payment] = await tx
		.select()
		.from(payments)
		.where(eq(payments.orderId, input.orderId))
		.for('update')
		.limit(1);

	if (!payment) throw new NotFoundError('Payment not found');
	if (payment.status === input.paymentStatus) return 'ignored';
	if (payment.status === 'succeeded' || payment.status === 'refunded') return 'ignored';

	await tx
		.update(payments)
		.set({
			status: input.paymentStatus,
			paidAt: input.paidAt ?? payment.paidAt,
			providerTransactionId: input.providerTransactionId ?? payment.providerTransactionId,
			updatedAt: new Date()
		})
		.where(eq(payments.id, payment.id));

	const orderStatus = PAYMENT_TO_ORDER[input.paymentStatus];
	await tx.update(orders).set({ status: orderStatus, updatedAt: new Date() }).where(eq(orders.id, input.orderId));

	if (orderStatus === 'paid' && input.paymentStatus === 'succeeded') {
		const [order] = await tx
			.select({
				userId: orders.userId,
				productId: orders.productId,
				category: products.category
			})
			.from(orders)
			.innerJoin(products, eq(products.id, orders.productId))
			.where(eq(orders.id, input.orderId))
			.limit(1);

		if (order?.category === 'cosmetic') {
			await tx
				.insert(userCosmetics)
				.values({ userId: order.userId, cosmeticId: order.productId })
				.onConflictDoNothing();
		}
	}

	return 'applied';
}

/** Process a verified webhook notification. Returns true when newly applied. */
export async function processWebhookNotification(input: {
	providerEventId: string;
	orderId: string;
	latestTransactionStatus: string;
	providerTransactionId?: string | null;
	paidAt?: Date | null;
	payload: string;
}): Promise<boolean> {
	const paymentStatus = SNAP_STATUS_TO_PAYMENT[input.latestTransactionStatus];
	if (!paymentStatus) throw new ValidationError('Unknown transaction status');

	return db.transaction(async (tx) => {
		const [payment] = await tx
			.select({ id: payments.id })
			.from(payments)
			.where(eq(payments.orderId, input.orderId))
			.limit(1);
		if (!payment) throw new NotFoundError('Payment not found');

		try {
			await tx.insert(paymentEvents).values({
				paymentId: payment.id,
				providerEventId: input.providerEventId,
				eventType: input.latestTransactionStatus,
				payload: input.payload,
				processedAt: new Date()
			});
		} catch (err) {
			if ((err as { code?: string }).code === '23505') return false;
			throw err;
		}

		const result = await applyStatus(tx, {
			orderId: input.orderId,
			paymentStatus,
			providerTransactionId: input.providerTransactionId,
			paidAt: input.paidAt
		});
		return result === 'applied';
	});
}

/** Server-side DOKU status inquiry + reconciliation; clients never set status. */
export async function syncPaymentStatus(orderId: string, userId?: string) {
	const [row] = await db
		.select({ order: orders, payment: payments })
		.from(orders)
		.innerJoin(payments, eq(payments.orderId, orders.id))
		.where(eq(orders.id, orderId))
		.limit(1);

	if (!row) throw new NotFoundError('Order not found');
	if (userId && row.order.userId !== userId) throw new ForbiddenError('Not your order');
	if (row.order.status !== 'pending') return row.order.status;
	if (Date.now() - row.payment.createdAt.getTime() < 60_000) return row.order.status;

	const status = await checkVirtualAccountStatus(
		row.payment.paymentCode!,
		row.payment.paymentCode!.slice(8)
	);
	const paymentStatus = status.latestTransactionStatus
		? SNAP_STATUS_TO_PAYMENT[status.latestTransactionStatus]
		: null;

	if (paymentStatus && paymentStatus !== row.payment.status) {
		await db.transaction(async (tx) => {
			const result = await applyStatus(tx, {
				orderId,
				paymentStatus,
				paidAt: status.paidAt ? new Date(status.paidAt) : null
			});
			if (result === 'ignored') return;

			const [payment] = await tx
				.select({ id: payments.id })
				.from(payments)
				.where(eq(payments.orderId, orderId))
				.limit(1);
			await tx.insert(paymentEvents).values({
				paymentId: payment.id,
				providerEventId: `check-status:${orderId}:${status.latestTransactionStatus}:${status.paidAt ?? ''}`,
				eventType: `check_status_${status.latestTransactionStatus}`,
				payload: JSON.stringify(status.raw),
				processedAt: new Date()
			}).onConflictDoNothing();
		});
	}
	return paymentStatus ? PAYMENT_TO_ORDER[paymentStatus] : row.order.status;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getOrderWithPayment(orderId: string, userId: string) {
	const [row] = await db
		.select({ order: orders, payment: payments, product: products })
		.from(orders)
		.innerJoin(payments, eq(payments.orderId, orders.id))
		.innerJoin(products, eq(products.id, orders.productId))
		.where(eq(orders.id, orderId))
		.limit(1);
	if (!row) throw new NotFoundError('Order not found');
	if (row.order.userId !== userId) throw new ForbiddenError('Not your order');
	return row;
}

export async function listUserOrders(userId: string) {
	return db
		.select({ order: orders, payment: payments, product: products })
		.from(orders)
		.innerJoin(payments, eq(payments.orderId, orders.id))
		.innerJoin(products, eq(products.id, orders.productId))
		.where(eq(orders.userId, userId))
		.orderBy(desc(orders.createdAt))
		.limit(50);
}

export async function getUserPlan(userId: string) {
	const purchases = await db
		.select({ paidAt: payments.paidAt, updatedAt: orders.updatedAt, durationDays: products.durationDays })
		.from(orders)
		.innerJoin(products, eq(products.id, orders.productId))
		.innerJoin(payments, eq(payments.orderId, orders.id))
		.where(
			and(
				eq(orders.userId, userId),
				eq(orders.status, 'paid'),
				eq(payments.status, 'succeeded'),
				eq(products.category, 'plan')
			)
		);

	purchases.sort((a, b) => (a.paidAt ?? a.updatedAt).getTime() - (b.paidAt ?? b.updatedAt).getTime());

	let accessUntil = 0;
	let isLifetime = false;
	for (const purchase of purchases) {
		if (purchase.durationDays === null) {
			isLifetime = true;
			continue;
		}
		if (purchase.durationDays < 1) continue;
		const paidAt = (purchase.paidAt ?? purchase.updatedAt).getTime();
		accessUntil = Math.max(paidAt, accessUntil) + purchase.durationDays * 24 * 60 * 60 * 1000;
	}

	const isPremium = isLifetime || accessUntil > Date.now();
	return {
		tier: isPremium ? 'premium' as const : 'free' as const,
		isLifetime,
		premiumUntil: isLifetime || !accessUntil ? null : new Date(accessUntil),
		daysRemaining: isPremium && !isLifetime ? Math.ceil((accessUntil - Date.now()) / (24 * 60 * 60 * 1000)) : 0
	};
}

export async function listActiveProducts() {
	return db
		.select()
		.from(products)
		.where(and(eq(products.active, true), eq(products.category, 'plan'), isNull(products.durationDays), eq(products.price, 100_000), gt(products.price, 0)))
		.orderBy(desc(products.price));
}

