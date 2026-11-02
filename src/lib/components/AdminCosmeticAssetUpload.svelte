<script lang="ts">
	import { optimizeImage } from '#lib/image-optimize';
	import { CLIENT_UPLOAD_LIMITS, formatFileSize } from '#lib/upload-limits';

	let { initialKey = null, label = 'Upload image', error = null }: { initialKey?: string | null; label?: string; error?: string | null } = $props();

	let currentKey = $derived(initialKey ?? '');
	let uploading = $state(false);
	let dragging = $state(false);
	let errorMessage = $state<string | null>(null);

	async function upload(original: File) {
		errorMessage = null;
		uploading = true;
		const limits = CLIENT_UPLOAD_LIMITS.cosmetic;
		try {
			const file = await optimizeImage(original, {
				maxWidth: limits.maxWidth,
				maxHeight: limits.maxHeight,
				maxBytes: limits.maxBytes
			});
			if (file.size > limits.maxBytes) {
				throw new Error(`That image is ${formatFileSize(file.size)}. Keep it under ${formatFileSize(limits.maxBytes)}`);
			}

			const response = await fetch('/api/uploads', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ kind: 'cosmetic', contentType: file.type, sizeBytes: file.size })
			});
			const signed = (await response.json()) as { key?: string; uploadUrl?: string; error?: string };
			if (!response.ok || !signed.key || !signed.uploadUrl) {
				throw new Error(signed.error ?? 'Could not prepare the upload');
			}

			const put = await fetch(signed.uploadUrl, {
				method: 'PUT',
				headers: { 'Content-Type': file.type },
				body: file
			});
			if (!put.ok) throw new Error('Upload failed');
			currentKey = signed.key;
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Upload failed';
		} finally {
			uploading = false;
		}
	}

	function onPicked(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (file) void upload(file);
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
		if (file && !uploading) void upload(file);
	}
</script>

<div class="asset-upload">
	<input type="hidden" name="assetKey" value={currentKey} />
	<label
		class="asset-drop {dragging ? 'is-dragging' : ''} {uploading ? 'is-busy' : ''}"
		ondragover={onDragOver}
		ondragleave={onDragLeave}
		ondrop={onDrop}
	>
		<input
			type="file"
			accept="image/jpeg,image/png,image/webp"
			class="sr-only"
			aria-label={label}
			disabled={uploading}
			onchange={onPicked}
		/>
		<span class="asset-icon" aria-hidden="true">
			<svg viewBox="0 0 24 24" fill="none">
				<path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
				<path d="M4 15.5v2.2A2.3 2.3 0 0 0 6.3 20h11.4A2.3 2.3 0 0 0 20 17.7v-2.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
			</svg>
		</span>
		<span class="asset-copy">
			<span class="asset-title">{uploading ? 'Uploading artwork' : currentKey ? 'Replace artwork' : label}</span>
			<span class="asset-hint">{currentKey ? 'Drag a new image here or click to choose' : 'PNG, JPG or WebP up to the upload limit'}</span>
		</span>
	</label>
	{#if currentKey}
		<p class="asset-key">Current asset: {currentKey}</p>
	{/if}
	{#if errorMessage}
		<p class="asset-error" role="alert">{errorMessage}</p>
	{:else if error}
		<p class="asset-error" role="alert">{error}</p>
	{/if}
</div>

<style>
	.asset-upload { display: grid; gap: 0.5rem; }

	.asset-drop {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		border: 1px dashed color-mix(in srgb, var(--color-foreground) 20%, transparent);
		border-radius: 1rem;
		background:
			radial-gradient(ellipse at 0% 0%, color-mix(in srgb, var(--color-pop-blue) 8%, transparent), transparent 70%),
			color-mix(in srgb, var(--color-surface) 62%, transparent);
		padding: 0.85rem 0.95rem;
		cursor: pointer;
		transition: border-color 200ms ease, background-color 200ms ease, box-shadow 200ms ease;
	}

	.asset-drop:hover { border-color: color-mix(in srgb, var(--color-accent) 48%, transparent); }

	.asset-drop:focus-within {
		border-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
		box-shadow: 0 0 0 4px var(--color-accent-soft);
	}

	.asset-drop.is-dragging {
		border-color: color-mix(in srgb, var(--color-accent) 80%, transparent);
		background: var(--color-accent-soft);
		box-shadow: 0 0 0 5px color-mix(in srgb, var(--color-accent) 12%, transparent);
	}

	.asset-drop.is-busy { cursor: progress; }

	.asset-icon {
		display: grid;
		width: 2.2rem;
		height: 2.2rem;
		flex: 0 0 auto;
		place-items: center;
		border: 1px solid color-mix(in srgb, var(--color-pop-blue) 32%, transparent);
		border-radius: 0.75rem;
		background: color-mix(in srgb, var(--color-pop-blue) 12%, var(--color-surface));
		color: var(--color-pop-blue);
	}

	.asset-icon svg { width: 1.1rem; height: 1.1rem; }
	.asset-copy { display: grid; min-width: 0; gap: 0.15rem; }
	.asset-title { color: var(--color-foreground); font-size: 0.82rem; font-weight: 600; }
	.asset-hint { color: var(--color-muted); font-size: 0.7rem; line-height: 1.45; }

	.asset-key {
		overflow-wrap: anywhere;
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.65rem;
	}

	.asset-error { color: var(--color-danger); font-size: 0.75rem; }

	@media (prefers-reduced-motion: reduce) {
		.asset-drop { transition: none; }
	}
</style>
