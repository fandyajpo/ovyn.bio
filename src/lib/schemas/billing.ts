import { z } from 'zod';
import { SNAP_CHANNELS } from '#lib/server/payments/doku/client';

export const checkoutSchema = z.object({
	productId: z.uuid(),
	channel: z.enum(SNAP_CHANNELS).default('VIRTUAL_ACCOUNT_BCA')
});

/** DOKU SNAP payment notification (non-strict: the provider may add fields). */
export const dokuNotificationSchema = z.looseObject({
	originalPartnerReferenceNo: z.string().optional(),
	virtualAccountData: z.looseObject({
		partnerServiceId: z.string().optional(),
		virtualAccountNo: z.string().optional(),
		paymentRequestId: z.string().optional(),
		trxId: z.string().optional()
	}).optional(),
	latestTransactionStatus: z.string().optional(),
	transactionStatusDesc: z.string().optional(),
	paidAmount: z.looseObject({ value: z.string(), currency: z.string() }).optional(),
	trxDateTime: z.string().optional(),
	additionalInfo: z.record(z.string(), z.unknown()).optional()
});

export type DokuNotification = z.infer<typeof dokuNotificationSchema>;
