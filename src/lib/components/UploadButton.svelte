<script lang="ts">
	import { toast } from '#lib/components/ui/toasts.svelte.ts';
	import Button from './ui/Button.svelte';

	let {
		kind,
		existingKey = null,
		label
	}: { kind: 'banner' | 'icon'; existingKey?: string | null; label: string } = $props();

	let input: HTMLInputElement | null = $state(null);
	let uploading = $state(false);
	let currentKey = $derived(existingKey);

	async function pick() {
		input?.click();
	}

	async function onPicked(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file) return;
		uploading = true;

		try {
			// 1. Ask the server for a presigned upload target (validates type/size).
			const res = await fetch('/api/uploads', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ kind, contentType: file.type, sizeBytes: file.size })
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error ?? 'Upload rejected');

			// 2. Upload bytes directly to object storage.
			const put = await fetch(json.uploadUrl, {
				method: 'PUT',
				headers: { 'Content-Type': file.type },
				body: file
			});
			if (!put.ok) throw new Error('Upload failed');

			// 3. Tell the app the new key is in use (server verifies ownership).
			const save = await fetch('/api/uploads', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ kind, key: json.key })
			});
			if (!save.ok) throw new Error('Could not save the file');

			currentKey = json.key;
			toast('success', `${kind} updated — reload to see it everywhere`);
			location.reload();
		} catch (err) {
			toast('error', err instanceof Error ? err.message : 'Upload failed');
		} finally {
			uploading = false;
			if (input) input.value = '';
		}
	}
</script>

<Button variant="secondary" onclick={pick} loading={uploading}>{label}</Button>
<input
	bind:this={input}
	type="file"
	accept={kind === 'banner' ? 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm' : 'image/jpeg,image/png,image/webp'}
	class="hidden"
	onchange={onPicked}
/>
