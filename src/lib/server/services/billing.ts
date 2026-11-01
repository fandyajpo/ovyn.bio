import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { cosmetics, orders, paymentEvents, payments, products, userCosmetics } from '#lib/server/db/schema';
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

// ---------------------------------------------------------------------------
// Order + payment creation
// ---------------------------------------------------------------------------

/**
 * Create a pending order and a pending payment with a DOKU virtual account.
 * Amount/currency come from the products row — never from the client.
 */
export async function createCheckout(userId: string, productId: string) {
	const [product] = await db
		.select()
		.from(products)
		.where(and(eq(products.id, productId), eq(products.active, true)))
		.limit(1);

	if (!product) throw new NotFoundError('Plan not found or not available');

	const [profile] = await db
		.select({ displayName: profiles.displayName, slug: profiles.slug })
		.from(profiles)
		.where(eq(profiles.userId, userId))
		.limit(1);

	// Lock user for order creation so a user can't flood parallel checkouts.
	const order = await db.transaction(async (tx) => {
		await tx.execute(sql`SELECT id FROM "user" WHERE id = ${userId} FOR UPDATE`);

		const [pending] = await tx
			.select()
			.from(orders)
			.where(and(eq(orders.userId, userId), eq(orders.status, 'pending')))
			.limit(1);

		if (pending) {
			throw new ConflictError('You already have a pending payment. Complete or let it expire first.');
		}

		const [created] = await tx
			.insert(orders)
			.values({ userId, productId: product.id, amount: product.price, currency: product.currency })
			.returning();
		return created;
	});

	const expiredDate = dokuTimestamp(new Date(Date.now() + VA_TTL_MINUTES * 60_000));

	// If DOKU rejects the VA creation, fail the order instead of leaving it
	// pending — a stuck pending order would block every future checkout.
	let va;
	try {
		va = await createVirtualAccount({
			trxId: order.id,
			amountMinor: product.price,
			currency: product.currency,
			customerName: profile?.displayName || profile?.slug || 'OVYN Member',
			channel: PAYMENT_CHANNEL,
			expiredDate
		});
	} catch (err) {
		await db
			.update(orders)
			.set({ status: 'failed', updatedAt: new Date() })
			.where(eq(orders.id, order.id));
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
	refunded: 'paid' // refund bookkeeping only; entitlement unchanged
};

type ApplyStatusInput = {
	orderId: string;
	paymentStatus: keyof typeof PAYMENT_TO_ORDER;
	providerTransactionId?: string | null;
	paidAt?: Date | null;
};

/**
 * Idempotent status application. Locks the payment row, records the state
 * machine transition, and only fulfils once (pending → paid).
 */
async function applyStatus(tx: Tx, input: ApplyStatusInput): Promise<'applied' | 'ignored'> {
	const [payment] = await tx
		.select()
		.from(payments)
		.where(eq(payments.orderId, input.orderId))
		.for('update')
		.limit(1);

	if (!payment) throw new NotFoundError('Payment not found');
	if (payment.status === input.paymentStatus) return 'ignored';

	// Terminal states never regress (out-of-order events).
	const terminal: string[] = ['succeeded', 'refunded'];
	if (terminal.includes(payment.status)) return 'ignored';

	await tx
		.update(payments)
		.set({
			status: input.paymentStatus,
			paidAt: input.paidAt ?? payment.paidAt,
			providerTransactionId: input.providerTransactionId ?? payment.providerTransactionId,
			updatedAt: new Date()
		})
		.where(eq(payments.id, payment.id));

	await tx
		.update(orders)
		.set({ status: PAYMENT_TO_ORDER[input.paymentStatus], updatedAt: new Date() })
		.where(eq(orders.id, input.orderId));

	// Fulfilment: when an order is newly paid, grant what was bought.
	// Cosmetic purchases land in user_cosmetics; the composite PK makes
	// duplicate grants impossible even across retried webhooks.
	if (PAYMENT_TO_ORDER[input.paymentStatus] === 'paid') {
		const [order] = await tx
			.select({ userId: orders.userId, productId: orders.productId })
			.from(orders)
			.where(eq(orders.id, input.orderId))
			.limit(1);

		if (order) {
			const [cosmetic] = await tx
				.select({ id: cosmetics.id })
				.from(cosmetics)
				.where(eq(cosmetics.id, order.productId))
				.limit(1);

			if (cosmetic) {
				await tx
					.insert(userCosmetics)
					.values({ userId: order.userId, cosmeticId: cosmetic.id })
					.onConflictDoNothing();
			}
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
	if (!paymentStatus) throw new ValidationError(`Unknown transaction status`);

	return db.transaction(async (tx) => {
		const [payment] = await tx
			.select({ id: payments.id })
			.from(payments)
			.where(eq(payments.orderId, input.orderId))
			.limit(1);
		if (!payment) throw new NotFoundError('Payment not found');

		// Idempotency: duplicate events are recorded once, applied once.
		try {
			await tx.insert(paymentEvents).values({
				paymentId: payment.id,
				providerEventId: input.providerEventId,
				eventType: input.latestTransactionStatus,
				payload: input.payload,
				processedAt: new Date()
			});
		} catch (err) {
			if ((err as { code?: string }).code === '23505') return false; // duplicate
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

/**
 * Server-side status inquiry: ask DOKU, then reconcile our DB.
 * Used by the checkout page poller and billing history.
 */
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

	// Skip provider calls in the 60s window DOKU advises after creation.
	const pendingTooSoon = Date.now() - new Date(row.payment.createdAt).getTime() < 60_000;
	if (pendingTooSoon) return row.order.status;

	const status = await checkVirtualAccountStatus(
		row.payment.paymentCode!,
		// customerNo is the VA number minus the 8-digit service id prefix.
		row.payment.paymentCode!.slice(8)
	);

	const paymentStatus = status.latestTransactionStatus
		? SNAP_STATUS_TO_PAYMENT[status.latestTransactionStatus]
		: null;

	if (paymentStatus && paymentStatus !== row.payment.status) {
		await db.transaction(async (tx) => {
			await applyStatus(tx, {
				orderId,
				paymentStatus,
				paidAt: status.paidAt ? new Date(status.paidAt) : null
			});

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
			});
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

export async function listActiveProducts() {
	return db.select().from(products).where(eq(products.active, true));
}
