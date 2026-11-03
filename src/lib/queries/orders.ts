import { browser } from '$app/env';
import { queryOptions } from '@tanstack/svelte-query';
import { queryKeys } from './keys';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled';

export type PaymentStatusResponse = { status: PaymentStatus };

/**
 * Payment status is owned by DOKU, so it is polled only while it can still
 * change. The endpoint re-syncs from DOKU server-side on every read.
 */
export function paymentStatusQueryOptions(orderId: string) {
	return queryOptions({
		queryKey: queryKeys.paymentStatus(orderId),
		queryFn: async ({ signal }): Promise<PaymentStatusResponse> => {
			const response = await fetch(`/api/payments/${orderId}/status`, {
				headers: { accept: 'application/json' },
				signal
			});
			if (!response.ok) throw new Error('Could not read the payment status');
			return (await response.json()) as PaymentStatusResponse;
		},
		// Queries stay client-side: the checkout page renders its initial order from load.
		enabled: browser,
		staleTime: 0,
		gcTime: 60_000,
		refetchInterval: (query) => (query.state.data?.status === 'pending' ? 10_000 : false)
	});
}
