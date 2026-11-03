import { randomUUID } from 'node:crypto';
import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
	S3ServiceException
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppError } from '../utils/errors';
import {
	AWS_ACCESS_KEY_ID,
	AWS_ENDPOINT_URL_S3,
	AWS_REGION,
	AWS_SECRET_ACCESS_KEY,
	S3_BUCKET
} from '$app/env/private';

function s3(): S3Client {
	const endpoint = AWS_ENDPOINT_URL_S3;
	const accessKeyId = AWS_ACCESS_KEY_ID;
	const secretAccessKey = AWS_SECRET_ACCESS_KEY;

	if (!endpoint || !accessKeyId || !secretAccessKey || !S3_BUCKET) {
		throw new AppError(500, 'Object storage is not configured');
	}

	return new S3Client({
		endpoint,
		region: AWS_REGION || 'auto',
		credentials: { accessKeyId, secretAccessKey },
		forcePathStyle: true
	});
}

let cached: { client: S3Client; bucket: string } | null = null;

function s3WithBucket(): { client: S3Client; bucket: string } {
	if (cached) return cached;

	const bucket = S3_BUCKET;
	if (!bucket) {
		throw new AppError(500, 'Object storage is not configured');
	}

	cached = { client: s3(), bucket };
	return cached;
}

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const CURSOR_MIME_TYPES = ['image/png', 'image/webp'] as const;
export const AUDIO_MIME_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm'] as const;
export const BANNER_MIME_TYPES = [...IMAGE_MIME_TYPES, 'image/gif', 'video/mp4', 'video/webm'] as const;
export type UploadMime = (typeof BANNER_MIME_TYPES)[number] | (typeof AUDIO_MIME_TYPES)[number];
export type UploadKind = 'banner' | 'avatar' | 'icon' | 'cosmetic' | 'audio' | 'cursor' | 'background';

type UploadLimit = { maxSize: number; mimeTypes: readonly UploadMime[] };

export const UPLOAD_LIMITS: Record<UploadKind, UploadLimit> = {
	banner: { maxSize: 25 * 1024 * 1024, mimeTypes: BANNER_MIME_TYPES },
	avatar: { maxSize: 1 * 1024 * 1024, mimeTypes: IMAGE_MIME_TYPES },
	icon: { maxSize: 1 * 1024 * 1024, mimeTypes: IMAGE_MIME_TYPES },
	cosmetic: { maxSize: 5 * 1024 * 1024, mimeTypes: IMAGE_MIME_TYPES },
	audio: { maxSize: 10 * 1024 * 1024, mimeTypes: AUDIO_MIME_TYPES },
	cursor: { maxSize: 256 * 1024, mimeTypes: CURSOR_MIME_TYPES },
	background: { maxSize: 25 * 1024 * 1024, mimeTypes: BANNER_MIME_TYPES }
};

const EXT_BY_MIME: Record<UploadMime, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif',
	'video/mp4': 'mp4',
	'video/webm': 'webm',
	'audio/mpeg': 'mp3',
	'audio/mp4': 'm4a',
	'audio/ogg': 'ogg',
	'audio/wav': 'wav',
	'audio/webm': 'webm'
};

export function validateUpload(
	kind: UploadKind,
	mimeType: string,
	sizeBytes: number
): { ext: string } {
	const limits = UPLOAD_LIMITS[kind];
	const mime = mimeType.toLowerCase();

	if (!limits.mimeTypes.includes(mime as UploadMime)) {
		throw new AppError(415, `Only ${limits.mimeTypes.join(', ')} files are allowed`);
	}
	if (sizeBytes <= 0 || sizeBytes > limits.maxSize) {
		throw new AppError(413, `File must be between 1 byte and ${limits.maxSize} bytes`);
	}

	return { ext: EXT_BY_MIME[mime as UploadMime] };
}

/** Presigned PUT: the client uploads the bytes directly to object storage. */
export async function presignUpload(
	userId: string,
	kind: UploadKind,
	mimeType: string,
	sizeBytes: number
): Promise<{ key: string; uploadUrl: string }> {
	const { ext } = validateUpload(kind, mimeType, sizeBytes);
	const { client, bucket } = s3WithBucket();

	const key = `${kind}s/${userId}/${randomUUID()}.${ext}`;
	// Objects are immutable: a replaced file gets a new key, so the browser and
	// any CDN may keep it for a year.
	const command = new PutObjectCommand({
		Bucket: bucket,
		Key: key,
		ContentType: mimeType,
		CacheControl: 'public, max-age=31536000, immutable'
	});
	const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });

	return { key, uploadUrl };
}

const presignedCache = new Map<string, { url: string; expiresAt: number }>();

const PRESIGNED_CACHE_MAX = 2_000;

// One signing job per key: concurrent renders of the same profile share a
// single presign call instead of racing several identical ones.
const inFlightPresigns = new Map<string, Promise<string>>();

/**
 * Short-lived read URL for private objects. The URL is reused for most of its
 * lifetime, otherwise it would change on every render and neither the browser
 * nor a CDN could cache the file behind it.
 */
export async function presignDownload(key: string, expiresIn = 60 * 60 * 24 * 7): Promise<string> {
	const cacheKey = `${expiresIn}:${key}`;
	const cached = presignedCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) return cached.url;

	const pending = inFlightPresigns.get(cacheKey);
	if (pending) return pending;

	const job = (async () => {
		const { client, bucket } = s3WithBucket();
		const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });

		// Evict only the oldest entry, so one burst never wipes everyone's URLs.
		// Deleting before re-setting also keeps a refreshed key at the newest
		// position instead of its original insertion slot.
		if (presignedCache.size >= PRESIGNED_CACHE_MAX) {
			const oldest = presignedCache.keys().next().value;
			if (oldest !== undefined) presignedCache.delete(oldest);
		}
		presignedCache.delete(cacheKey);
		presignedCache.set(cacheKey, { url, expiresAt: Date.now() + (expiresIn - 60 * 60) * 1000 });
		return url;
	})();

	inFlightPresigns.set(cacheKey, job);
	try {
		return await job;
	} finally {
		// Only the caller that created the job removes it; waiters above just
		// awaited it and need the entry gone for the next miss.
		if (inFlightPresigns.get(cacheKey) === job) inFlightPresigns.delete(cacheKey);
	}
}

export async function deleteObject(key: string): Promise<void> {
	const { client, bucket } = s3WithBucket();
	try {
		await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
	} catch (err) {
		if (err instanceof S3ServiceException) {
			throw new AppError(502, 'Could not delete the file from storage');
		}
		throw err;
	}
}

/**
 * Remove a file that a record no longer points at. Seed artwork under `static/`
 * ships with the app and is shared, so it is never deleted here. Failures are
 * logged rather than thrown, because a saved record should not fail just
 * because storage was briefly unavailable.
 */
export async function deleteReplacedObject(key: string | null | undefined): Promise<void> {
	if (!key || key.startsWith('static/')) return;
	try {
		await deleteObject(key);
	} catch (err) {
		console.error('Could not delete replaced file', key, err);
	}
}

/** Verify the object belongs to the user (keys are `{kind}s/{userId}/…`) before storing the key. */
export function assertOwnObjectKey(userId: string, kind: UploadKind, key: string): void {
	if (!key.startsWith(`${kind}s/${userId}/`)) {
		throw new AppError(403, 'You can only use files you uploaded');
	}
}
