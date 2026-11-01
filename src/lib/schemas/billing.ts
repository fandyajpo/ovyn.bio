import { z } from 'zod';
import { SNAP_CHANNELS } from '$lib/server/payments/doku/client';

export const checkoutSchema = z.object({
	productId: z.string().uuid(),
	channel: z.enum(SNAP_CHANNELS).default('VIRTUAL_ACCOUNT_BCA')
});

/** DOKU SNAP payment notification (non-strict: the provider may add fields). */
export const dokuNotificationSchema = z.object({
	originalPartnerReferenceNo: z.string().optional(),
	virtualAccountData: z
		.object({
			partnerServiceId: z.string().optional(),
			virtualAccountNo: z.string().optional(),
			paymentRequestId: z.string().optional(),
			trxId: z.string().optional()
		})
		.passthrough()
		.optional(),
	latestTransactionStatus: z.string().optional(),
	transactionStatusDesc: z.string().optional(),
	paidAmount: z
		.object({ value: z.string(), currency: z.string() })
		.passthrough()
		.optional(),
	trxDateTime: z.string().optional(),
	additionalInfo: z.record(z.unknown()).optional()
}).passthrough();

export type DokuNotification = z.infer<typeof dokuNotificationSchema>;
