import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyNotificationSignature } from '$lib/server/payments/doku/webhook';
import { processWebhookNotification } from '$lib/server/services/billing';
import { AppError } from '$lib/server/utils/errors';

/**
 * DOKU HTTP Notification endpoint.
 *
 * - Signature verified against the raw body before anything is trusted.
 * - Events are recorded once (unique provider_event_id = X-EXTERNAL-ID),
 *   so duplicate or retried notifications are safe.
 * - Status transitions are guarded server-side; redirect params are never
 *   used to mark an order paid.
 */
export const POST: RequestHandler = async ({ request, url }) => {
	// Raw body must be used for the signature — not a re-serialization.
	const rawBody = await request.text();

	try {
		verifyNotificationSignature({
			method: 'POST',
			notificationPath: url.pathname, // e.g. /api/webhooks/doku
			body: rawBody,
			timestamp: request.headers.get('X-TIMESTAMP'),
			signature: request.headers.get('X-SIGNATURE'),
			authorization: request.headers.get('Authorization')
		});
	} catch (err) {
		if (err instanceof AppError) return json({ error: err.message }, { status: err.status });
		return json({ error: 'Verification failed' }, { status: 401 });
	}

	let payload: unknown;
	try {
		payload = JSON.parse(rawBody); // non-strict: providers may add fields
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	// Resolve the order id: SNAP VA notifications reference our trxId via
	// originalPartnerReferenceNo (e-wallet/direct-debit) or virtualAccountData.
	const body = payload as {
		originalPartnerReferenceNo?: string;
		virtualAccountData?: { trxId?: string; paidAmount?: { value?: string } };
		latestTransactionStatus?: string;
		originalReferenceNo?: string;
		trxDateTime?: string;
	};
	const orderId = body.originalPartnerReferenceNo ?? body.virtualAccountData?.trxId;

	// VA payment notifications signal payment via paidAmount (no status code);
	// e-wallet / direct-debit notifications carry latestTransactionStatus.
	const status =
		body.latestTransactionStatus ??
		(body.virtualAccountData?.paidAmount?.value ? '00' : undefined);

	if (!orderId || !status) {
		return json({ error: 'Unrecognised notification' }, { status: 400 });
	}

	try {
		const applied = await processWebhookNotification({
			providerEventId: request.headers.get('X-EXTERNAL-ID') ?? `${orderId}:${status}`,
			orderId,
			latestTransactionStatus: status,
			providerTransactionId: body.originalReferenceNo ?? null,
			paidAt: body.trxDateTime ? new Date(body.trxDateTime) : null,
			payload: rawBody
		});
		return json({ responseCode: '2005600', responseMessage: 'Processed', applied });
	} catch (err) {
		// Unknown order: acknowledge so DOKU doesn't retry forever, but log loudly.
		console.error('Webhook processing failed', err);
		if (err instanceof AppError && err.status === 404) {
			return json({ responseCode: '2005600', responseMessage: 'Ignored' });
		}
		return json({ error: 'Processing failed' }, { status: 500 });
	}
};
