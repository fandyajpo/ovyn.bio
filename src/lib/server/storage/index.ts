import { randomUUID } from 'node:crypto';
import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	ListObjectsV2Command,
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
import {
	KIND_MIME_TYPES,
	MEDIA_LIMITS,
	extensionForMime,
	familyMatchesKind,
	isAllowedMime,
	sniffMediaFamily,
	type UploadKind
} from '#lib/media/categories';

// The category rules live in the shared media module; these re-exports keep
// existing import sites stable while there is only ever one source of truth.
export { IMAGE_MIME_TYPES, CURSOR_MIME_TYPES, AUDIO_MIME_TYPES, BANNER_MIME_TYPES, UPLOAD_KINDS } from '#lib/media/categories';
export type { UploadKind, UploadMime, MediaFamily } from '#lib/media/categories';

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

export function validateUpload(
	kind: UploadKind,
	mimeType: string,
	sizeBytes: number
): { ext: string } {
	const mime = mimeType.toLowerCase();

	if (!isAllowedMime(kind, mime)) {
		throw new AppError(415, `Only ${KIND_MIME_TYPES[kind].join(', ')} files are allowed`);
	}
	if (sizeBytes <= 0 || sizeBytes > MEDIA_LIMITS[kind].maxBytes) {
		throw new AppError(413, `File must be between 1 byte and ${MEDIA_LIMITS[kind].maxBytes} bytes`);
	}

	return { ext: extensionForMime(mime) };
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

export type StoredObject = { key: string; sizeBytes: number };

/** Every object under a prefix, paginated. Used by the storage report. */
export async function listStoredObjects(prefix?: string): Promise<StoredObject[]> {
	const { client, bucket } = s3WithBucket();
	const objects: StoredObject[] = [];
	let continuationToken: string | undefined;

	do {
		const page = await client.send(
			new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: continuationToken })
		);
		for (const object of page.Contents ?? []) {
			if (object.Key) objects.push({ key: object.Key, sizeBytes: object.Size ?? 0 });
		}
		continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
	} while (continuationToken);

	return objects;
}

/**
 * The bytes went straight from the browser to storage, so the declared
 * content type and the stored file signature are both checked before any
 * database record is allowed to point at the object.
 */
export async function verifyStoredObject(key: string, kind: UploadKind): Promise<boolean> {
	try {
		const { client, bucket } = s3WithBucket();
		const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
		if (!isAllowedMime(kind, (head.ContentType ?? '').toLowerCase())) return false;

		const range = await client.send(
			new GetObjectCommand({ Bucket: bucket, Key: key, Range: 'bytes=0-63' })
		);
		const bytes = new Uint8Array((await range.Body?.transformToByteArray()) ?? []);
		return familyMatchesKind(kind, sniffMediaFamily(bytes));
	} catch {
		return false;
	}
}

/**
 * Remove a file that a record no longer points at. Seed artwork under `static/`
 * ships with the app and is shared, so it is never deleted here. Deletion goes
 * through the durable cleanup queue (imported lazily to avoid a cycle), where
 * every key is re-verified as unreferenced before it is actually removed and
 * failures are retried instead of lost.
 */
export async function deleteReplacedObject(key: string | null | undefined): Promise<void> {
	if (!key || key.startsWith('static/')) return;

	const { enqueueMediaCleanup, processMediaCleanupQueue } = await import('#lib/server/media/cleanup');
	await enqueueMediaCleanup([key]);
	await processMediaCleanupQueue();
}

/**
 * Second sanitize pass for avatar SVGs, defense in depth after the browser's
 * DOM-based pass: script blocks, active-content elements, event handler
 * attributes, script/data URLs and foreign objects are stripped. When the
 * stored markup changes it is re-uploaded to the same key. Returns true when
 * the object was rewritten.
 */
export async function scrubStoredSvg(key: string): Promise<boolean> {
	const { client, bucket } = s3WithBucket();
	const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
	if (!(head.ContentType ?? '').toLowerCase().includes('svg')) return false;

	const range = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
	const bytes = new Uint8Array((await range.Body?.transformToByteArray()) ?? []);
	if (bytes.byteLength > MEDIA_LIMITS['avatar'].maxBytes) return false;

	const original = new TextDecoder().decode(bytes);
	let cleaned = original
		.replace(/<script[\s\S]*?<\/script\s*>/gi, '')
		.replace(/<script[^>]*\/?>/gi, '')
		.replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, '')
		.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
	cleaned = cleaned.replace(/(href|xlink:href)\s*=\s*("|')\s*(javascript|data)[^"']*\2/gi, '$1="#"');
	cleaned = cleaned.trim();

	if (cleaned === original || cleaned.length === 0) return false;

	await client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			ContentType: head.ContentType ?? 'image/svg+xml',
			CacheControl: 'public, max-age=31536000, immutable',
			Body: cleaned
		})
	);
	return true;
}

/** Verify the object belongs to the user (keys are `{kind}s/{userId}/…`) before storing the key. */
export function assertOwnObjectKey(userId: string, kind: UploadKind, key: string): void {
	if (!key.startsWith(`${kind}s/${userId}/`)) {
		throw new AppError(403, 'You can only use files you uploaded');
	}
}