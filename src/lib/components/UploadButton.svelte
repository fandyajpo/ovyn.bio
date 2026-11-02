<script lang="ts">
	import { toast } from '#lib/components/ui/toasts.svelte.ts';
	import { cn } from '#lib/utils';

	let {
		kind,
		existingKey = null,
		label
	}: { kind: 'banner' | 'avatar' | 'icon' | 'audio' | 'cursor'; existingKey?: string | null; label: string } = $props();

	let input: HTMLInputElement | null = $state(null);
	let uploading = $state(false);
	let dragging = $state(false);
	let currentKey = $derived(existingKey);

	function attachInput(element: HTMLInputElement) {
		input = element;
		return () => {
			if (input === element) input = null;
		};
	}

	async function pick() {
		input?.click();
	}

	function onPicked(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (file) void uploadFile(file);
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
		if (file && !uploading) void uploadFile(file);
	}

	async function uploadFile(file: File) {
		uploading = true;
		try {
			const res = await fetch('/api/uploads', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ kind, contentType: file.type, sizeBytes: file.size })
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error ?? 'Upload rejected');

			const put = await fetch(json.uploadUrl, {
				method: 'PUT',
				headers: { 'Content-Type': file.type },
				body: file
			});
			if (!put.ok) throw new Error('Upload failed');

			const save = await fetch('/api/uploads', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ kind, key: json.key })
			});
			if (!save.ok) {
				const result = await save.json().catch(() => null);
				throw new Error(result?.error ?? 'Could not save the file');
			}

			currentKey = json.key;
			toast('success', `${kind} updated`);
			location.reload();
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
	class={cn('upload-dropzone', dragging && 'upload-dropzone--active')}
	onclick={pick}
	ondragover={onDragOver}
	ondragleave={onDragLeave}
	ondrop={onDrop}
	disabled={uploading}
	aria-label={`Upload ${kind}: ${label}. Choose a file or drag it here.`}
>
	<span class="upload-dropzone-copy">{currentKey ? 'Drop to replace your current file' : 'Drag and drop a file'}</span>
	<span class="upload-dropzone-action">{uploading ? 'Uploading…' : label}</span>
	<span class="upload-dropzone-hint">or click to browse</span>
</button>
<input
	{@attach attachInput}
	type="file"
	accept={kind === 'banner'
		? 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm'
		: kind === 'audio'
			? 'audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm'
			: kind === 'cursor'
				? 'image/png,image/webp'
				: 'image/jpeg,image/png,image/webp'}
	class="hidden"
	onchange={onPicked}
/>

<style>
	.upload-dropzone {
		appearance: none;
		display: flex;
		width: 100%;
		min-height: 7rem;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		border: 1px dashed var(--color-divider);
		border-radius: 1.1rem;
		background: color-mix(in srgb, var(--color-surface) 58%, transparent);
		padding: 1rem;
		color: var(--color-foreground);
		font: inherit;
		cursor: pointer;
		transition: background-color 180ms ease, border-color 180ms ease, transform 180ms ease;
	}

	.upload-dropzone:hover:not(:disabled) { border-color: color-mix(in srgb, var(--color-accent) 42%, transparent); }
	.upload-dropzone:active:not(:disabled) { transform: scale(0.99); }
	.upload-dropzone:disabled { cursor: wait; opacity: 0.72; }
	.upload-dropzone--active {
		transform: scale(1.01);
		border-color: color-mix(in srgb, var(--color-accent) 68%, transparent);
		background: var(--color-accent-soft);
	}

	.upload-dropzone-copy,
	.upload-dropzone-hint { color: var(--color-muted); font-size: 0.75rem; text-align: center; }
	.upload-dropzone-action { color: var(--color-accent); font-size: 0.8rem; font-weight: 600; }
	.upload-dropzone-hint { font-size: 0.65rem; opacity: 0.75; }

	@media (prefers-reduced-motion: reduce) {
		.upload-dropzone { transition: none; }
	}
</style>
