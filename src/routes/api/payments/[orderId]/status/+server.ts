import type { RequestHandler } from './$types';
import { syncPaymentStatus } from '#lib/server/services/billing';
import { AppError } from '#lib/server/utils/errors';
import { rateLimit } from '#lib/server/utils/rate-limit';

/**
 * Server-side payment status sync. The client polls this, but the status is
 * always reconciled with DOKU's Check Status API here - the frontend can
 * never forge a payment state.
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return Response.json({ error: 'unauthenticated' }, { status: 401 });

	try {
		rateLimit(`pay-status:${locals.user.id}`, 30, 60_000);
		const status = await syncPaymentStatus(params.orderId, locals.user.id);
		return Response.json({ status });
	} catch (err) {
		if (err instanceof AppError) return Response.json({ error: err.message }, { status: err.status });
		console.error(err);
		return Response.json({ error: 'Status check failed' }, { status: 502 });
	}
};
