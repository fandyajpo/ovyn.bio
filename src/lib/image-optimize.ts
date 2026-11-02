/**
 * Downscale and re-encode an image in the browser before it is uploaded, so a
 * 12 MB phone photo does not land in object storage (or the database) as-is.
 * GIFs are left untouched so animations survive.
 */
export async function optimizeImage(
	file: File,
	options: { maxWidth: number; maxHeight: number; maxBytes: number }
): Promise<File> {
	if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
		return file;
	}

	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch {
		return file;
	}

	try {
		let width = bitmap.width;
		let height = bitmap.height;
		const scale = Math.min(1, options.maxWidth / width, options.maxHeight / height);
		width = Math.max(1, Math.round(width * scale));
		height = Math.max(1, Math.round(height * scale));

		let quality = 0.9;
		let blob = await encode(bitmap, width, height, quality);
		let attempt = 0;

		while (blob && blob.size > options.maxBytes && attempt < 7) {
			attempt += 1;
			quality = Math.max(0.45, quality - 0.08);
			blob = await encode(bitmap, width, height, quality);
			if (blob && blob.size > options.maxBytes) {
				width = Math.max(1, Math.round(width * 0.82));
				height = Math.max(1, Math.round(height * 0.82));
			}
		}

		if (!blob) return file;

		const base = file.name.replace(/\.[^.]+$/, '') || 'image';
		return new File([blob], `${base}.webp`, { type: 'image/webp', lastModified: Date.now() });
	} finally {
		bitmap.close?.();
	}
}

function encode(bitmap: ImageBitmap, width: number, height: number, quality: number): Promise<Blob | null> {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext('2d');
	if (!context) return Promise.resolve(null);
	context.drawImage(bitmap, 0, 0, width, height);
	return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/webp', quality));
}
