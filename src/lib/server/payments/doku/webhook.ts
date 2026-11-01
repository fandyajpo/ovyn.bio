import crypto from 'node:crypto';
import { AppError } from '#lib/server/utils/errors';
import { minifiedBodyHash, symmetricSignature } from './signature';
import { DOKU_SECRET_KEY } from '$app/env/private';

/**
 * Verify an inbound DOKU HTTP Notification.
 *
 * Per the symmetric-signature docs, DOKU signs notifications with
 * HMAC_SHA512(clientSecret, stringToSign) where
 *   stringToSign = HTTPMethod + ":" + EndpointUrl + ":" + AccessToken + ":"
 *                + Lowercase(HexEncode(SHA256(minify(RequestBody)))) + ":" + TimeStamp
 * and EndpointUrl is the path of the merchant Notification URL.
 * The AccessToken component comes from the Authorization header DOKU sends;
 * it is treated as empty when absent.
 * https://developers.doku.com/get-started-with-doku-api/signature-component/snap/symmetric-signature
 */
export function verifyNotificationSignature(params: {
	method: string;
	notificationPath: string;
	body: string; // RAW, unmodified request body
	timestamp: string | null;
	signature: string | null;
	authorization: string | null;
}): void {
	if (!DOKU_SECRET_KEY) {
		throw new AppError(500, 'DOKU_SECRET_KEY is not configured');
	}

	if (!params.timestamp || !params.signature) {
		throw new AppError(401, 'Missing notification signature');
	}

	const accessToken = params.authorization?.replace(/^Bearer\s+/i, '').trim() ?? '';

	const stringToSign = [
		params.method.toUpperCase(),
		params.notificationPath,
		accessToken,
		minifiedBodyHash(params.body),
		params.timestamp
	].join(':');

	const expected = symmetricSignature(DOKU_SECRET_KEY, stringToSign);

	// Constant-time comparison.
	if (!timingSafeEqual(expected, params.signature)) {
		throw new AppError(401, 'Invalid notification signature');
	}
}

function timingSafeEqual(a: string, b: string): boolean {
	const bufA = Buffer.from(a, 'utf8');
	const bufB = Buffer.from(b, 'utf8');
	if (bufA.length !== bufB.length) return false;
	return crypto.timingSafeEqual(bufA, bufB);
}
