/** Every query key starts here, so one root prefix can be invalidated at once. */
export const queryKeys = {
	all: ['ovyn'] as const,
	paymentStatus: (orderId: string) => [...queryKeys.all, 'payment-status', orderId] as const
};
