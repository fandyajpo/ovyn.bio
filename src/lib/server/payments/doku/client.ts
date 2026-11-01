import { randomBytes } from 'node:crypto';
import { AppError } from '../utils/errors';
import { dokuEnv, generateExternalId, signedHeaders } from './signature';
import { DOKU_BASE_URL, DOKU_ENV, DOKU_PARTNER_SERVICE_ID } from '$app/env/private';

/**
 * DOKU Direct API — SNAP endpoints implemented per official docs:
 * - Create VA:  POST /virtual-accounts/bi-snap-va/v1.1/transfer-va/create-va
 *   https://developers.doku.com/accept-payments/direct-api/snap/integration-guide/virtual-account
 * - Check status: POST /orders/v1.0/transfer-va/status
 *   https://developers.doku.com/get-started-with-doku-api/check-status-api/snap
 */

const CREATE_VA_PATH = '/virtual-accounts/bi-snap-va/v1.1/transfer-va/create-va';
const CHECK_STATUS_PATH = '/orders/v1.0/transfer-va/status';

export const SNAP_CHANNELS = [
	'VIRTUAL_ACCOUNT_BCA',
	'VIRTUAL_ACCOUNT_BRI',
	'VIRTUAL_ACCOUNT_BNI',
	'VIRTUAL_ACCOUNT_MANDIRI',
	'VIRTUAL_ACCOUNT_PERMATA',
	'VIRTUAL_ACCOUNT_DANAMON',
	'VIRTUAL_ACCOUNT_Bnc',
	'VIRTUAL_ACCOUNT_BJB',
	'VIRTUAL_ACCOUNT_SINARMAS',
	'VIRTUAL_ACCOUNT_CIMB',
	'VIRTUAL_ACCOUNT_BTN',
	'VIRTUAL_ACCOUNT_BSI',
	'VIRTUAL_ACCOUNT_BSS'
] as const;

export type SnapChannel = (typeof SNAP_CHANNELS)[number];

export type CreateVaInput = {
	/** Merchant order id (trxId) — our orders.id. */
	trxId: string;
	/** Amount in minor units (IDR rupiah). */
	amountMinor: number;
	currency: string;
	/** Customer display name for the VA. */
	customerName: string;
	customerEmail?: string;
	channel: SnapChannel;
	/** VA expiry, ISO 8601 with +07:00 offset. */
	expiredDate: string;
};

export type CreateVaResult = {
	virtualAccountNo: string;
	inquiryRequestId?: string;
	howToPayPage?: string;
	raw: unknown;
};

export type CheckStatusResult = {
	/** 00 success · 03 pending · 04 refunded · 05 canceled · 06 failed · 07 not found */
	latestTransactionStatus: string | null;
	description: string | null;
	paidAmountMinor: number | null;
	paidAt: string | null;
	raw: unknown;
};

function partnerServiceId(): string {
	const bin = DOKU_PARTNER_SERVICE_ID;
	if (!bin) {
		throw new AppError(500, 'DOKU_PARTNER_SERVICE_ID is not configured');
	}
	// 8 digits, left-padded with spaces per SNAP spec.
	return bin.padStart(8, ' ').slice(0, 8);
}

/** DOKU wants amounts as "1000000.00" strings (2 decimals, ISO 4217). */
function amount(value: number, currency: string) {
	return { value: value.toFixed(2), currency };
}

/** Random 10-digit customer number for DGPC virtual accounts. */
function customerNo(): string {
	return randomBytes(10).toString('hex').replace(/\D/g, '').padStart(10, '7').slice(0, 10);
}

export async function createVirtualAccount(input: CreateVaInput): Promise<CreateVaResult> {
	const { baseUrl } = dokuEnv();

	// virtualAccountNo must be partnerServiceId + customerNo (SNAP spec).
	const customerNumber = customerNo();
	const virtualAccountNo = partnerServiceId() + customerNumber;

	const body = JSON.stringify({
		partnerServiceId: partnerServiceId(),
		customerNo: customerNumber,
		virtualAccountNo,
		virtualAccountName: input.customerName.slice(0, 255),
		virtualAccountEmail: input.customerEmail,
		trxId: input.trxId,
		totalAmount: amount(input.amountMinor, input.currency),
		expiredDate: input.expiredDate,
		additionalInfo: { channel: input.channel }
	});

	const res = await fetch(`${baseUrl}${CREATE_VA_PATH}`, {
		method: 'POST',
		headers: await signedHeaders('POST', CREATE_VA_PATH, body),
		body
	});

	const data = (await res.json().catch(() => ({}))) as {
		responseCode?: string;
		responseMessage?: string;
		virtualAccountData?: {
			virtualAccountNo?: string;
			inquiryRequestId?: string;
		};
		additionalInfo?: { howToPayPage?: string };
	};

	if (!res.ok || !data.virtualAccountData?.virtualAccountNo) {
		throw new AppError(
			502,
			`Payment provider could not create the payment code: ${data.responseMessage ?? res.status}`
		);
	}

	return {
		virtualAccountNo: data.virtualAccountData.virtualAccountNo,
		inquiryRequestId: data.virtualAccountData.inquiryRequestId,
		howToPayPage: data.additionalInfo?.howToPayPage,
		raw: data
	};
}

export async function checkVirtualAccountStatus(
	virtualAccountNo: string,
	customerNoValue: string
): Promise<CheckStatusResult> {
	const { baseUrl } = dokuEnv();

	const body = JSON.stringify({
		partnerServiceId: partnerServiceId(),
		customerNo: customerNoValue,
		virtualAccountNo,
		additionalInfo: {}
	});

	const res = await fetch(`${baseUrl}${CHECK_STATUS_PATH}`, {
		method: 'POST',
		headers: await signedHeaders('POST', CHECK_STATUS_PATH, body),
		body
	});

	const data = (await res.json().catch(() => ({}))) as {
		responseCode?: string;
		responseMessage?: string;
		latestTransactionStatus?: string;
		transactionStatusDesc?: string;
		paidAmount?: { value?: string };
		paidTime?: string;
	};

	if (!res.ok) {
		throw new AppError(
			502,
			`Payment provider status check failed: ${data.responseMessage ?? res.status}`
		);
	}

	return {
		latestTransactionStatus: data.latestTransactionStatus ?? null,
		description: data.transactionStatusDesc ?? null,
		paidAmountMinor: data.paidAmount?.value
			? Math.round(parseFloat(data.paidAmount.value) * 100)
			: null,
		paidAt: data.paidTime ?? null,
		raw: data
	};
}

/** Fresh X-EXTERNAL-ID for the next outbound request. */
export const newExternalId = generateExternalId;
