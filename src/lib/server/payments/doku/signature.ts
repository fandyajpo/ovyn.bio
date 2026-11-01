import { createHash, createHmac, sign as cryptoSign } from 'node:crypto';
import { AppError } from '#lib/server/utils/errors';
import {
	DOKU_BASE_URL,
	DOKU_CLIENT_ID,
	DOKU_ENV,
	DOKU_PRIVATE_KEY,
	DOKU_SECRET_KEY
} from '$app/env/private';

/**
 * DOKU Direct API (SNAP) — implements exactly what the official docs specify:
 *
 * - B2B access token: POST /authorization/v1/access-token/b2b
 *     X-SIGNATURE = SHA256withRSA(privateKey, clientID + "|" + timestamp)
 *     https://developers.doku.com/accept-payments/direct-api/snap/integration-guide/get-token-api/b2b
 * - Symmetric signature on every other request:
 *     stringToSign = HTTPMethod + ":" + EndpointUrl + ":" + AccessToken + ":"
 *                  + Lowercase(HexEncode(SHA256(minify(RequestBody)))) + ":" + TimeStamp
 *     X-SIGNATURE  = HMAC_SHA512(clientSecret, stringToSign)
 *     https://developers.doku.com/get-started-with-doku-api/signature-component/snap/symmetric-signature
 * - Webhook notifications are verified with the same symmetric signature,
 *   where EndpointUrl is the merchant notification path and the access-token
 *   component is the Bearer token DOKU sends (empty when absent).
 */

/** Asia/Jakarta offset timestamp, e.g. 2026-02-01T09:30:00+07:00. */
export function dokuTimestamp(date = new Date()): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Jakarta',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	}).formatToParts(date);

	const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
	// en-CA may return 24 for midnight under h23; normalize.
	const hour = get('hour') === '24' ? '00' : get('hour');

	return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:${get('second')}+07:00`;
}

export function minifiedBodyHash(body: string): string {
	// Lowercase(HexEncode(SHA256(minify(RequestBody))))
	return createHash('sha256').update(body, 'utf8').digest('hex').toLowerCase();
}

export function symmetricSignature(clientSecret: string, stringToSign: string): string {
	return createHmac('sha512', clientSecret).update(stringToSign, 'utf8').digest('base64');
}

/** SHA256withRSA over `clientID|timestamp` — used only for the B2B token request. */
export function asymmetricSignature(privateKey: string, clientId: string, timestamp: string): string {
	return cryptoSign('sha256', Buffer.from(`${clientId}|${timestamp}`, 'utf8'), {
		key: privateKey.replace(/\\n/g, '\n'),
		format: 'pem'
	}).toString('base64');
}

export function dokuEnv(): { baseUrl: string; clientId: string; clientSecret: string } {
	const clientId = DOKU_CLIENT_ID;
	const clientSecret = DOKU_SECRET_KEY;
	if (!clientId || !clientSecret) {
		throw new AppError(500, 'DOKU is not configured');
	}
	const baseUrl = DOKU_BASE_URL
		? DOKU_BASE_URL.replace(/\/$/, '')
		: DOKU_ENV === 'production'
			? 'https://api.doku.com'
			: 'https://api-sandbox.doku.com';
	return { baseUrl, clientId, clientSecret };
}

// ---------------------------------------------------------------------------
// B2B access token (cached until ~60s before expiry)
// ---------------------------------------------------------------------------

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
	if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
		return cachedToken.accessToken;
	}

	const { baseUrl, clientId } = dokuEnv();
	const privateKey = DOKU_PRIVATE_KEY;
	if (!privateKey) {
		throw new AppError(500, 'DOKU_PRIVATE_KEY is not configured');
	}

	const timestamp = dokuTimestamp();
	const signature = asymmetricSignature(privateKey, clientId, timestamp);

	const res = await fetch(`${baseUrl}/authorization/v1/access-token/b2b`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CLIENT-KEY': clientId,
			'X-TIMESTAMP': timestamp,
			'X-SIGNATURE': signature
		},
		body: JSON.stringify({ grantType: 'client_credentials' })
	});

	if (!res.ok) {
		const detail = await res.text().catch(() => '');
		throw new AppError(502, 'Payment provider rejected the token request', detail.slice(0, 200));
	}

	const data = (await res.json()) as { accessToken: string; expiresIn: number };
	cachedToken = {
		accessToken: data.accessToken,
		expiresAt: Date.now() + data.expiresIn * 1000
	};
	return cachedToken.accessToken;
}

/** Headers required by every authenticated SNAP request. */
export async function signedHeaders(
	method: 'POST' | 'PUT' | 'DELETE',
	path: string,
	body: string
): Promise<Record<string, string>> {
	const { clientId, clientSecret } = dokuEnv();
	const accessToken = await getAccessToken();
	const timestamp = dokuTimestamp();

	const stringToSign = [
		method,
		path,
		accessToken,
		minifiedBodyHash(body),
		timestamp
	].join(':');

	return {
		'Content-Type': 'application/json',
		'X-TIMESTAMP': timestamp,
		'X-SIGNATURE': symmetricSignature(clientSecret, stringToSign),
		'X-PARTNER-ID': clientId,
		'X-EXTERNAL-ID': generateExternalId(),
		'CHANNEL-ID': 'H2H',
		Authorization: `Bearer ${accessToken}`
	};
}

/** Numeric, unique-per-day request id (X-EXTERNAL-ID). */
export function generateExternalId(): string {
	return Date.now().toString().padStart(14, '0') + Math.floor(Math.random() * 1e9).toString().padStart(9, '0');
}
