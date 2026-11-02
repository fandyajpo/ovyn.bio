/** Client-side upload limits, mirroring the server's storage limits. */
export const CLIENT_UPLOAD_LIMITS = {
	avatar: { maxBytes: 1024 * 1024, maxWidth: 512, maxHeight: 512 },
	icon: { maxBytes: 1024 * 1024, maxWidth: 512, maxHeight: 512 },
	banner: { maxBytes: 25 * 1024 * 1024, maxWidth: 1920, maxHeight: 1080 },
	background: { maxBytes: 25 * 1024 * 1024, maxWidth: 1920, maxHeight: 1080 },
	cosmetic: { maxBytes: 5 * 1024 * 1024, maxWidth: 1024, maxHeight: 1024 },
	cursor: { maxBytes: 256 * 1024, maxWidth: 96, maxHeight: 96 },
	audio: { maxBytes: 10 * 1024 * 1024 }
} as const;

export function formatFileSize(bytes: number): string {
	if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes % (1024 * 1024) === 0 ? 0 : 1)} MB`;
	return `${Math.round(bytes / 1024)} KB`;
}
