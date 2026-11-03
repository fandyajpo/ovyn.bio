import {
	ANIMATION_LIMITS,
	MEDIA_LIMITS,
	familyMatchesKind,
	isAllowedMime,
	isAnimatedWebP,
	scanGifAnimation,
	sniffMediaFamily,
	type UploadKind
} from './categories';
import { optimizeImage } from '#lib/image-optimize';
import { formatFileSize } from '#lib/upload-limits';

/**
 * The single upload pipeline every media slot uses in the browser:
 *
 * 1. validate extension, declared MIME, size and the actual file signature
 * 2. guard against decompression bombs before anything is decoded
 * 3. optimize per category: WebP for photographs, byte-for-byte for pixel art
 *    and every animated format, sanitized markup for avatar SVGs
 * 4. request a unique immutable key and a signed PUT
 * 5. upload the bytes straight to object storage (credentials stay server-side)
 * 6. confirm, where the server verifies the stored signature before referencing
 *
 * Replaced files are cleaned up server-side through the durable cleanup queue,
 * so a failed delete never leaves an obsolete object in storage.
 */

export type MediaUploadOptions = {
	kind: UploadKind;
	scope?: 'profile' | 'circle';
	/**
	 * Pixel-art and other lossless artwork is stored byte-for-byte when it
	 * already fits, so no resampling or lossy pass ever touches a sprite.
	 */
	preservePixelArt?: boolean;
};

export type MediaUploadResult = { key: string; mime: string; sizeBytes: number };

/** Reject decodes above ~36 MP; a hostile file cannot stall the tab. */
const DECODE_BOMB_PIXELS = 36 * 1024 * 1024;

export async function uploadMedia(file: File, options: MediaUploadOptions): Promise<MediaUploadResult> {
	const limits = MEDIA_LIMITS[options.kind];

	if (file.size > limits.maxBytes) {
		throw new Error(`That file is ${formatFileSize(file.size)}. Keep it under ${formatFileSize(limits.maxBytes)}`);
	}

	// The browser's declared MIME type is untrusted: sniff the real signature.
	const signature = new Uint8Array(await file.slice(0, 32).arrayBuffer());
	const family = sniffMediaFamily(signature);
	if (!familyMatchesKind(options.kind, family)) {
		throw new Error('That file type does not match what this slot accepts');
	}
	if (file.type && !isAllowedMime(options.kind, file.type)) {
		throw new Error('That file type does not match what this slot accepts');
	}

	let uploadFile = file;

	if (family === 'vector') {
		// Only the avatar slot opts into vectors, and only after sanitizing.
		uploadFile = await sanitizeSvgAvatar(file);
	} else if (family === 'image') {
		uploadFile =
			options.kind === 'avatar'
				? await prepareAvatar(file)
				: await prepareGenericImage(file, options);
	}

	// Video and audio pass through untouched; re-encoding either in the browser
	// is out of scope and would risk corrupting playable files.

	const presigned = await fetch('/api/uploads', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ kind: options.kind, scope: options.scope, contentType: uploadFile.type, sizeBytes: uploadFile.size })
	});
	const ticket = (await presigned.json()) as { key?: string; uploadUrl?: string; error?: string };
	if (!presigned.ok || !ticket.key || !ticket.uploadUrl) {
		throw new Error(ticket.error ?? 'Upload rejected');
	}

	const put = await fetch(ticket.uploadUrl, {
		method: 'PUT',
		headers: { 'Content-Type': uploadFile.type },
		body: uploadFile
	});
	if (!put.ok) throw new Error('Upload failed');

	const confirm = await fetch('/api/uploads', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ kind: options.kind, scope: options.scope, key: ticket.key })
	});
	if (!confirm.ok) {
		const result = (await confirm.json().catch(() => null)) as { error?: string } | null;
		throw new Error(result?.error ?? 'Could not save the file');
	}

	return { key: ticket.key, mime: uploadFile.type, sizeBytes: uploadFile.size };
}

/** Non-avatar images: decode guard, pixel-art passthrough, WebP re-encode. */
async function prepareGenericImage(file: File, options: MediaUploadOptions): Promise<File> {
	// A GIF is stored byte-for-byte so its animation survives; this slot only
	// takes GIFs as a cover image, where re-encoding would drop the frames.
	if (file.type === 'image/gif') return file;

	const limits = MEDIA_LIMITS[options.kind];
	// `maxDimension` is null only for audio slots, which never decode here.
	const maxDimension = limits.maxDimension ?? DECODE_BOMB_PIXELS;
	const bitmap = await decodeImage(file, options.kind);
	try {
		if (bitmap.width > maxDimension || bitmap.height > maxDimension || bitmap.width * bitmap.height > DECODE_BOMB_PIXELS) {
			throw new Error(`That image is too large (${bitmap.width}×${bitmap.height}).`);
		}
	} finally {
		bitmap.close?.();
	}

	const preservePixelArt = options.preservePixelArt ?? options.kind === 'cosmetic';
	const losslessAlready = file.type === 'image/png' || file.type === 'image/webp';
	if (preservePixelArt && losslessAlready) {
		// Pixel art stays byte-for-byte: no resampling, no smoothing, alpha intact.
		return file;
	}
	if (file.type === 'image/webp') {
		// Already an optimized WebP (for example from the crop editor):
		// never process the same asset twice.
		return file;
	}
	return optimizeImage(file, {
		maxWidth: limits.maxWidth ?? limits.maxDimension ?? 1920,
		maxHeight: limits.maxHeight ?? limits.maxDimension ?? 1920,
		maxBytes: limits.maxBytes
	});
}

/**
 * Profile pictures accept every format, and each gets the treatment it needs:
 * animated files are stored byte-for-byte so frames, timing and transparency
 * survive; already-efficient formats pass through; anything the browser can
 * decode is re-encoded to WebP; and formats it cannot decode locally are
 * rejected with an explanation instead of storing something that renders
 * nowhere.
 */
async function prepareAvatar(file: File): Promise<File> {
	const limits = MEDIA_LIMITS['avatar'];
	const bytes = new Uint8Array(await file.arrayBuffer());

	// GIF: validate the animation, then keep every frame and its timing.
	if (file.type === 'image/gif') {
		const animation = scanGifAnimation(bytes);
		if (!animation) throw new Error('That GIF looks corrupted, so it cannot be used as a profile picture');
		if (animation.frames > ANIMATION_LIMITS.maxFrames) {
			throw new Error(`That GIF has ${animation.frames} frames. Keep it under ${ANIMATION_LIMITS.maxFrames}.`);
		}
		if (animation.durationMs > ANIMATION_LIMITS.maxDurationMs) {
			throw new Error(`That GIF loops for ${Math.round(animation.durationMs / 1000)}s. Keep it under ${ANIMATION_LIMITS.maxDurationMs / 1000}s.`);
		}
		return file;
	}

	// Animated WebP: stored byte-for-byte so the loop keeps playing.
	if (file.type === 'image/webp' && isAnimatedWebP(bytes)) return file;

	// AVIF (animated or still) and ICO icons are already compact and render
	// as-is everywhere modern; re-encoding them adds nothing.
	if (file.type === 'image/avif' || file.type === 'image/x-icon' || file.type === 'image/vnd.microsoft.icon') {
		return file;
	}

	// Everything else must decode here: BMP converts to WebP, and formats the
	// browser cannot read locally (TIFF, HEIC) are explained instead of stored
	// in a form no browser can render.
	const bitmap = await decodeImage(file, 'profile picture');
	try {
		if (bitmap.width > limits.maxDimension || bitmap.height > limits.maxDimension || bitmap.width * bitmap.height > DECODE_BOMB_PIXELS) {
			throw new Error(`That image is too large (${bitmap.width}×${bitmap.height}).`);
		}
	} finally {
		bitmap.close?.();
	}
	return optimizeImage(file, { maxWidth: limits.maxWidth, maxHeight: limits.maxHeight, maxBytes: limits.maxBytes });
}

async function decodeImage(file: File, slot: string): Promise<ImageBitmap> {
	try {
		return await createImageBitmap(file);
	} catch {
		if (file.type === 'image/tiff' || file.type === 'image/heic' || file.type === 'image/heif') {
			const label = file.type === 'image/tiff' ? 'TIFF' : 'HEIC';
			throw new Error(`Your browser cannot read ${label} files locally, so the ${slot} cannot be prepared. Export it as PNG or JPG first.`);
		}
		throw new Error(`That image could not be read, so it cannot be used as a ${slot}.`);
	}
}

/**
 * Sanitizes an avatar SVG before it leaves the browser: the payload must parse
 * as SVG, every script/active-content element is removed, event handler
 * attributes are stripped, script and data URLs in links are dropped, and the
 * result is re-serialized. The server runs a second, conservative pass at
 * confirm time.
 */
async function sanitizeSvgAvatar(file: File): Promise<File> {
	const parsed = new DOMParser().parseFromString(await file.text(), 'image/svg+xml');
	if (parsed.querySelector('parsererror') || parsed.documentElement?.nodeName.toLowerCase() !== 'svg') {
		throw new Error('That SVG file looks corrupted, so it cannot be used as a profile picture');
	}

	const svg = parsed.documentElement;
	svg.querySelectorAll('script, foreignObject, iframe, object, embed, link, base').forEach((node) => node.remove());
	for (const node of svg.querySelectorAll('*')) {
		for (const attribute of [...node.attributes]) {
			const name = attribute.name.toLowerCase();
			const value = attribute.value.trim().toLowerCase();
			if (name.startsWith('on')) {
				node.removeAttribute(attribute.name);
			} else if (
				(name === 'href' || name === 'xlink:href') &&
				(value.startsWith('javascript:') || value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://') || value.startsWith('//'))
			) {
				node.removeAttribute(attribute.name);
			}
		}
	}

	const cleaned = new XMLSerializer().serializeToString(svg);
	if (new TextEncoder().encode(cleaned).byteLength > MEDIA_LIMITS['avatar'].maxBytes) {
		throw new Error(`That SVG is too large after sanitizing. Keep it under ${formatFileSize(MEDIA_LIMITS['avatar'].maxBytes)}`);
	}
	const roundTrip = new DOMParser().parseFromString(cleaned, 'image/svg+xml');
	if (roundTrip.querySelector('parsererror')) {
		throw new Error('That SVG file looks corrupted, so it cannot be used as a profile picture');
	}

	return new File([cleaned], file.name.endsWith('.svg') ? file.name : `${file.name}.svg`, {
		type: 'image/svg+xml',
		lastModified: Date.now()
	});
}

export { extensionForMime } from './categories';