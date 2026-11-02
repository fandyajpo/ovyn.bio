import { randomUUID, createHash } from 'node:crypto';
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
	if (!cached) {
		cached = { client: s3(), bucket: S3_BUCKET };
	}
	return cached;
}

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const BANNER_MIME_TYPES = [...IMAGE_MIME_TYPES, 'image/gif', 'video/mp4', 'video/webm'] as const;
export type UploadMime = (typeof BANNER_MIME_TYPES)[number];
export type UploadKind = 'banner' | 'icon' | 'cosmetic';

type UploadLimit = { maxSize: number; mimeTypes: readonly UploadMime[] };

export const UPLOAD_LIMITS: Record<UploadKind, UploadLimit> = {
	banner: { maxSize: 25 * 1024 * 1024, mimeTypes: BANNER_MIME_TYPES },
	icon: { maxSize: 1 * 1024 * 1024, mimeTypes: IMAGE_MIME_TYPES },
	cosmetic: { maxSize: 5 * 1024 * 1024, mimeTypes: IMAGE_MIME_TYPES }
};

const EXT_BY_MIME: Record<UploadMime, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif',
	'video/mp4': 'mp4',
	'video/webm': 'webm'
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
	const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: mimeType });
	const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });

	return { key, uploadUrl };
}

/** Short-lived read URL for private objects. */
export async function presignDownload(key: string, expiresIn = 60 * 60 * 24 * 7): Promise<string> {
	const { client, bucket } = s3WithBucket();
	return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
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

/** Verify the object belongs to the user (keys are `{kind}s/{userId}/…`) before storing the key. */
export function assertOwnObjectKey(userId: string, kind: UploadKind, key: string): void {
	if (!key.startsWith(`${kind}s/${userId}/`)) {
		throw new AppError(403, 'You can only use files you uploaded');
	}
}

/** ETag-ish integrity helper (reserved for future client-side checksums). */
export function checksum(body: string): string {
	return createHash('sha256').update(body).digest('hex');
}
