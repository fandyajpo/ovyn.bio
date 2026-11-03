<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from '#lib/components/ui/toasts.svelte.ts';
	import { cn } from '#lib/utils';
	import { uploadMedia } from '#lib/media/client-upload';
	import { isAnimatedWebP } from '#lib/media/categories';
	import ImageCropModal from './ImageCropModal.svelte';

	let {
		kind,
		existingKey = null,
		label,
		scope = 'profile'
	}: {
		kind: 'banner' | 'avatar' | 'icon' | 'audio' | 'cursor' | 'background';
		existingKey?: string | null;
		label: string;
		scope?: 'profile' | 'circle';
	} = $props();

	let input: HTMLInputElement | null = $state(null);
	let uploading = $state(false);
	let dragging = $state(false);
	let cropOpen = $state(false);
	let cropFile = $state<File | null>(null);

	const cropAspect = $derived(kind === 'avatar' ? 1 : 2.7);

	function attachInput(element: HTMLInputElement) {
		input = element;
		return () => {
			if (input === element) input = null;
		};
	}

	function pick() {
		input?.click();
	}

	function onPicked(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (file && !uploading) void handlePicked(file);
	}

	function onDragOver(event: DragEvent) {
		event.preventDefault();
		if (!uploading) dragging = true;
	}

	function onDragLeave(event: DragEvent) {
		if (event.currentTarget === event.target) dragging = false;
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		const file = event.dataTransfer?.files[0];
		if (file && !uploading) void handlePicked(file);
	}

	/**
	 * Static rasters get positioned by hand before they are stored. Animated
	 * formats skip the cropper so their frames survive untouched.
	 */
	async function isCropWorthy(file: File) {
		if (kind !== 'avatar' && kind !== 'banner') return false;
		if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) return false;
		if (file.type === 'image/webp') return !isAnimatedWebP(new Uint8Array(await file.slice(0, 32).arrayBuffer()));
		if (file.type === 'image/avif') {
			const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
			const brand = String.fromCharCode(bytes[8] ?? 0, bytes[9] ?? 0, bytes[10] ?? 0, bytes[11] ?? 0);
			return brand !== 'avis'; // an animated AVIF keeps its frames
		}
		return true;
	}

	async function handlePicked(file: File) {
		if (await isCropWorthy(file)) {
			cropFile = file;
			cropOpen = true;
			return;
		}
		await uploadFile(file);
	}

	function onCropped(file: File) {
		cropFile = null;
		cropOpen = false;
		void uploadFile(file);
	}

	// Closing the dialog without confirming drops the picked file.
	$effect(() => {
		if (cropOpen) return;
		untrack(() => {
			if (!cropFile) return;
			cropFile = null;
			if (input) input.value = '';
		});
	});

	async function uploadFile(original: File) {
		uploading = true;
		try {
			// The shared pipeline validates, optimizes per category and uploads
			// through a signed PUT; a replaced file is queued for cleanup server-side.
			const { key } = await uploadMedia(original, { kind, scope });

			toast('success', `${kind} updated`);
			// Refresh the page data so the new file shows up, without losing
			// whatever the visitor was typing in the form around the upload.
			await invalidateAll();
		} catch (err) {
			toast('error', err instanceof Error ? err.message : 'Upload failed');
		} finally {
			uploading = false;
			if (input) input.value = '';
		}
	}
</script>

<button
	type="button"
	class={cn('upload-dropzone', dragging && 'is-dragging', uploading && 'is-busy')}
	onclick={pick}
	ondragover={onDragOver}
	ondragleave={onDragLeave}
	ondrop={onDrop}
	disabled={uploading}
	aria-label={`Upload ${kind}: ${label}. Choose a file or drag it here.`}
>
	<span class="upload-icon" aria-hidden="true">
		<svg viewBox="0 0 24 24" fill="none">
			<path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
			<path d="M4 15.5v2.2A2.3 2.3 0 0 0 6.3 20h11.4A2.3 2.3 0 0 0 20 17.7v-2.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
		</svg>
	</span>
	<span class="upload-copy">
		<span class="upload-title">{uploading ? 'Uploading your file' : dragging ? 'Drop it right here' : label}</span>
		<span class="upload-hint">{existingKey ? 'Your current file will be replaced' : 'Drag and drop, or browse from this device'}</span>
	</span>
	<span class="upload-action">{uploading ? 'Working' : existingKey ? 'Replace' : 'Browse'}</span>
</button>
<input
	{@attach attachInput}
	type="file"
	accept={kind === 'banner' || kind === 'background'
		? 'image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm'
		: kind === 'avatar'
			? 'image/jpeg,image/png,image/gif,image/webp,image/avif,image/svg+xml,image/bmp,image/tiff,image/heic,image/heif,image/x-icon'
			: kind === 'audio'
				? 'audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm'
				: kind === 'cursor'
					? 'image/png,image/webp'
					: 'image/jpeg,image/png,image/webp'}
	class="hidden"
	onchange={onPicked}
/>

<ImageCropModal
	bind:open={cropOpen}
	file={cropFile}
	aspect={cropAspect}
	title={kind === 'avatar' ? 'Crop your profile picture' : scope === 'circle' ? 'Crop your banner' : 'Crop your cover'}
	onconfirm={onCropped}
/>

<style>
	.upload-dropzone {
		position: relative;
		appearance: none;
		display: flex;
		width: 100%;
		align-items: center;
		gap: 0.9rem;
		border: 1px dashed color-mix(in srgb, var(--color-foreground) 20%, transparent);
		border-radius: 1.15rem;
		background:
			radial-gradient(ellipse at 0% 0%, color-mix(in srgb, var(--color-accent) 7%, transparent), transparent 70%),
			color-mix(in srgb, var(--color-surface) 78%, transparent);
		padding: 1rem 1.05rem;
		color: var(--color-foreground);
		font: inherit;
		text-align: left;
		cursor: pointer;
		transition: border-color 200ms ease, background-color 200ms ease, transform 200ms ease, box-shadow 200ms ease;
	}

	.upload-dropzone:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
		box-shadow: 0 14px 34px rgb(0 0 0 / 10%);
	}

	.upload-dropzone:active:not(:disabled) { transform: scale(0.995); }
	.upload-dropzone:disabled { cursor: progress; }

	.upload-dropzone.is-dragging {
		border-color: color-mix(in srgb, var(--color-accent) 78%, transparent);
		background: var(--color-accent-soft);
		box-shadow: 0 0 0 5px color-mix(in srgb, var(--color-accent) 12%, transparent);
		transform: scale(1.005);
	}

	.upload-icon {
		display: grid;
		width: 2.5rem;
		height: 2.5rem;
		flex: 0 0 auto;
		place-items: center;
		border: 1px solid color-mix(in srgb, var(--color-accent) 30%, transparent);
		border-radius: 0.85rem;
		background: color-mix(in srgb, var(--color-accent) 12%, var(--color-surface));
		color: var(--color-accent);
	}

	.upload-icon svg { width: 1.25rem; height: 1.25rem; }
	.upload-copy { display: grid; min-width: 0; flex: 1; gap: 0.2rem; }

	.upload-title {
		color: var(--color-foreground);
		font-size: 0.85rem;
		font-weight: 600;
	}

	.upload-hint {
		color: var(--color-muted);
		font-size: 0.72rem;
		line-height: 1.45;
	}

	.upload-action {
		flex: 0 0 auto;
		border: 1px solid var(--color-divider);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-surface) 86%, transparent);
		padding: 0.35rem 0.7rem;
		color: var(--color-accent);
		font-family: var(--font-mono);
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.is-busy .upload-icon { animation: upload-pulse 1.4s ease-in-out infinite; }

	@keyframes upload-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.45; }
	}

	@media (max-width: 30rem) {
		.upload-dropzone { flex-wrap: wrap; }
		.upload-copy { flex-basis: 60%; }
	}

	@media (prefers-reduced-motion: reduce) {
		.upload-dropzone { transition: none; }
		.is-busy .upload-icon { animation: none; }
	}
</style>
