/**
 * One source of truth for upload categories, limits and file-signature
 * sniffing. This module is client-safe (no Node imports), so the browser
 * pipeline and the server pipeline validate against the exact same rules.
 */

export const UPLOAD_KINDS = ['banner', 'avatar', 'icon', 'cosmetic', 'audio', 'cursor', 'background'] as const;

export type UploadKind = (typeof UPLOAD_KINDS)[number];

/** Container families recognized by signature. `vector` covers sanitized SVG. */
export type MediaFamily = 'image' | 'video' | 'audio' | 'vector';

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'] as const;
export const CURSOR_MIME_TYPES = ['image/png', 'image/webp'] as const;
export const AUDIO_MIME_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm'] as const;
export const BANNER_MIME_TYPES = [...IMAGE_MIME_TYPES, 'video/mp4', 'video/webm'] as const;
/** The profile picture is the widest slot: every raster, vector and animated format. */
export const AVATAR_MIME_TYPES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/avif',
	'image/svg+xml',
	'image/bmp',
	'image/tiff',
	'image/heic',
	'image/heif',
	'image/x-icon',
	'image/vnd.microsoft.icon'
] as const;

export type UploadMime =
	| (typeof IMAGE_MIME_TYPES)[number]
	| (typeof CURSOR_MIME_TYPES)[number]
	| (typeof AUDIO_MIME_TYPES)[number]
	| (typeof BANNER_MIME_TYPES)[number]
	| (typeof AVATAR_MIME_TYPES)[number];

/** MIME types each slot accepts, as declared by the browser. */
export const KIND_MIME_TYPES: Record<UploadKind, readonly UploadMime[]> = {
	banner: BANNER_MIME_TYPES,
	avatar: AVATAR_MIME_TYPES,
	icon: IMAGE_MIME_TYPES,
	cosmetic: IMAGE_MIME_TYPES,
	audio: AUDIO_MIME_TYPES,
	cursor: CURSOR_MIME_TYPES,
	background: BANNER_MIME_TYPES
};

/**
 * File families each slot accepts after signature sniffing. Banners and
 * backgrounds additionally take video covers; the avatar additionally takes
 * sanitized SVG vectors; everything else stays visual.
 */
export const KIND_ALLOWED_FAMILIES: Record<UploadKind, readonly MediaFamily[]> = {
	banner: ['image', 'video'],
	avatar: ['image', 'vector'],
	icon: ['image'],
	cosmetic: ['image'],
	audio: ['audio'],
	cursor: ['image'],
	background: ['image', 'video']
};

export function familyMatchesKind(kind: UploadKind, family: MediaFamily | null): boolean {
	return family !== null && KIND_ALLOWED_FAMILIES[kind].includes(family);
}

/**
 * Limits per slot. `maxWidth`/`maxHeight` are the render targets for the
 * optimization pass (never upscaled), `maxDimension` is the hard decode guard
 * against decompression bombs. The avatar is generous because animated GIFs and
 * AVIF files are chunky.
 */
export const MEDIA_LIMITS = {
	banner: { maxBytes: 25 * 1024 * 1024, maxWidth: 1920, maxHeight: 1080, maxDimension: 3840 },
	avatar: { maxBytes: 4 * 1024 * 1024, maxWidth: 512, maxHeight: 512, maxDimension: 4096 },
	icon: { maxBytes: 1024 * 1024, maxWidth: 512, maxHeight: 512, maxDimension: 2048 },
	cosmetic: { maxBytes: 5 * 1024 * 1024, maxWidth: 1024, maxHeight: 1024, maxDimension: 2048 },
	audio: { maxBytes: 10 * 1024 * 1024, maxWidth: null, maxHeight: null, maxDimension: null },
	cursor: { maxBytes: 256 * 1024, maxWidth: 96, maxHeight: 96, maxDimension: 512 },
	background: { maxBytes: 25 * 1024 * 1024, maxWidth: 1920, maxHeight: 1080, maxDimension: 3840 }
} as const satisfies Record<UploadKind, { maxBytes: number; maxWidth: number | null; maxHeight: number | null; maxDimension: number | null }>;

/** Animation caps: a hostile or silly-long loop is rejected before upload. */
export const ANIMATION_LIMITS = { maxFrames: 500, maxDurationMs: 30_000 } as const;

const EXT_BY_MIME: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif',
	'image/avif': 'avif',
	'image/svg+xml': 'svg',
	'image/bmp': 'bmp',
	'image/tiff': 'tiff',
	'image/heic': 'heic',
	'image/heif': 'heif',
	'image/x-icon': 'ico',
	'image/vnd.microsoft.icon': 'ico',
	'video/mp4': 'mp4',
	'video/webm': 'webm',
	'audio/mpeg': 'mp3',
	'audio/mp4': 'm4a',
	'audio/ogg': 'ogg',
	'audio/wav': 'wav',
	'audio/webm': 'webm'
};

export function isAllowedMime(kind: UploadKind, mimeType: string): boolean {
	return (KIND_MIME_TYPES[kind] as readonly string[]).includes(mimeType.toLowerCase());
}

export function extensionForMime(mimeType: string): string {
	return EXT_BY_MIME[mimeType.toLowerCase()] ?? 'bin';
}

/**
 * Reads the file signature from the first bytes and reports the real container
 * family, which the browser's declared MIME type can never be trusted to match.
 * Text-like payloads report `vector` (SVG) and are only accepted by slots that
 * explicitly opt into sanitized vectors.
 */
export function sniffMediaFamily(bytes: Uint8Array): MediaFamily | null {
	if (bytes.length < 12) return null;

	const matches = (...signature: number[]): boolean =>
		signature.every((byte, index) => bytes[index] === byte);

	const ascii = (offset: number, text: string): boolean => {
		for (let index = 0; index < text.length; index += 1) {
			if (bytes[offset + index] !== text.charCodeAt(index)) return false;
		}
		return true;
	};

	// JPEG: FF D8 FF
	if (matches(0xff, 0xd8, 0xff)) return 'image';
	// PNG: 89 50 4E 47
	if (matches(0x89, 0x50, 0x4e, 0x47)) return 'image';
	// GIF: "GIF8"
	if (ascii(0, 'GIF8')) return 'image';
	// WebP: "RIFF"...."WEBP"; WAV shares the RIFF root, so WEBP is checked first
	if (ascii(0, 'RIFF') && ascii(8, 'WEBP')) return 'image';
	// WAV: "RIFF"...."WAVE"
	if (ascii(0, 'RIFF') && ascii(8, 'WAVE')) return 'audio';
	// BMP: "BM"
	if (matches(0x42, 0x4d)) return 'image';
	// TIFF: II*\0 or MM\0*
	if (matches(0x49, 0x49, 0x2a, 0x00) || matches(0x4d, 0x4d, 0x00, 0x2a)) return 'image';
	// ICO: 00 00 01 00 (the cursor variant 00 00 02 00 is rejected on purpose)
	if (matches(0x00, 0x00, 0x01, 0x00)) return 'image';

	// MP4-family containers ("ftyp" box at offset 4); the brand separates audio,
	// still images (AVIF) and multi-image containers (HEIC/HEIF) from video.
	if (ascii(4, 'ftyp')) {
		const brand = String.fromCharCode(bytes[8] ?? 0, bytes[9] ?? 0, bytes[10] ?? 0, bytes[11] ?? 0);
		if (brand.startsWith('M4A') || brand.startsWith('m4a')) return 'audio';
		if (
			brand.startsWith('avif') ||
			brand.startsWith('avis') ||
			brand.startsWith('heic') ||
			brand.startsWith('heix') ||
			brand.startsWith('hevc') ||
			brand.startsWith('heim') ||
			brand.startsWith('heis') ||
			brand.startsWith('mif1') ||
			brand.startsWith('msf1')
		) {
			return 'image';
		}
		return 'video';
	}
	// WebM/Matroska: EBML header
	if (matches(0x1a, 0x45, 0xdf, 0xa3)) return 'video';
	// Ogg
	if (ascii(0, 'OggS')) return 'audio';
	// MP3: ID3 tag or a sync frame
	if (ascii(0, 'ID3')) return 'audio';
	if (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0) return 'audio';
	// FLAC
	if (ascii(0, 'fLaC')) return 'audio';

	// Anything text-like starting with "<" is treated as an SVG vector; slots
	// must opt in explicitly, and the payload is sanitized before it is stored.
	const head = String.fromCharCode(...bytes.slice(0, 16)).trimStart();
	if (head.startsWith('<')) return 'vector';

	return null;
}

export type GifAnimation = { frames: number; durationMs: number };

/**
 * Walks a GIF block structure to count frames and sum frame delays, so
 * animation limits are enforced without decoding anything. Returns null for a
 * malformed GIF: the signature was valid, so this means truncated or corrupt.
 */
export function scanGifAnimation(bytes: Uint8Array): GifAnimation | null {
	// "GIF87a" / "GIF89a" header, then the logical screen descriptor.
	let cursor = 6 + 7;
	const globalColorFlag = bytes[10] ?? 0;
	if ((globalColorFlag & 0x80) !== 0) cursor += 3 * 2 ** ((globalColorFlag & 0x07) + 1);

	let frames = 0;
	let durationMs = 0;
	let pendingDelay = 0;

	// Hard bounds keep a hostile file from spinning this walker forever.
	while (cursor < bytes.length && frames <= ANIMATION_LIMITS.maxFrames + 1) {
		const block = bytes[cursor];
		if (block === undefined) return null;
		cursor += 1;

		if (block === 0x3b) break; // trailer

		if (block === 0x21) {
			// Extension block: a label byte, then sub-blocks.
			const label = bytes[cursor];
			cursor += 1;
			if (label === undefined) return null;
			if (label === 0xf9) {
				// Graphic control extension: sub-block size, packed field, then
				// two little-endian delay bytes in units of 10 ms.
				const size = bytes[cursor] ?? 0;
				const delay = ((bytes[cursor + 2] ?? 0) | ((bytes[cursor + 3] ?? 0) << 8)) * 10;
				// A zero delay renders at about 100 ms in every browser.
				pendingDelay = delay === 0 ? 100 : delay;
				cursor += 1 + size;
			} else {
				// Skip every sub-block of any other extension.
				for (;;) {
					const size = bytes[cursor];
					if (size === undefined) return null;
					cursor += 1 + size;
					if (size === 0) break;
				}
			}
			continue;
		}

		if (block === 0x2c) {
			// Image descriptor: one frame, then its optional local color table and
			// LZW data as sub-blocks.
			frames += 1;
			durationMs += pendingDelay;
			pendingDelay = 0;
			const packed = bytes[cursor + 9] ?? 0;
			cursor += 9;
			if ((packed & 0x80) !== 0) cursor += 3 * 2 ** ((packed & 0x07) + 1);
			for (;;) {
				const size = bytes[cursor];
				if (size === undefined) return null;
				cursor += 1 + size;
				if (size === 0) break;
			}
			continue;
		}

		return null; // unknown block type: corrupt GIF
	}

	return { frames, durationMs };
}

/** True when a WebP container carries an ANIM chunk, i.e. it is animated. */
export function isAnimatedWebP(bytes: Uint8Array): boolean {
	if (bytes.length < 21) return false;
	const ascii = (offset: number, text: string): boolean => {
		for (let index = 0; index < text.length; index += 1) {
			if (bytes[offset + index] !== text.charCodeAt(index)) return false;
		}
		return true;
	};
	return ascii(12, 'VP8X') && ((bytes[20] ?? 0) & 0x02) !== 0;
}

export function formatFileSize(bytes: number): string {
	if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes % (1024 * 1024) === 0 ? 0 : 1)} MB`;
	return `${Math.round(bytes / 1024)} KB`;
}