<script lang="ts">
	let { initialKey = null, label = 'Upload image', error = null }: { initialKey?: string | null; label?: string; error?: string | null } = $props();
	let currentKey = $derived(initialKey ?? '');
	let uploading = $state(false);
	let errorMessage = $state<string | null>(null);

	async function onPicked(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		errorMessage = null;
		uploading = true;
		try {
			const response = await fetch('/api/uploads', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ kind: 'cosmetic', contentType: file.type, sizeBytes: file.size })
			});
			const signed = (await response.json()) as { key?: string; uploadUrl?: string; error?: string };
			if (!response.ok || !signed.key || !signed.uploadUrl) {
				throw new Error(signed.error ?? 'Could not prepare the upload');
			}

			const upload = await fetch(signed.uploadUrl, {
				method: 'PUT',
				headers: { 'Content-Type': file.type },
				body: file
			});
			if (!upload.ok) throw new Error('Upload failed');
			currentKey = signed.key;
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Upload failed';
		} finally {
			uploading = false;
			input.value = '';
		}
	}
</script>

<div class="flex flex-col gap-2">
	<input type="hidden" name="assetKey" value={currentKey} />
	<label class="inline-flex w-fit">
		<input
			type="file"
			accept="image/jpeg,image/png,image/webp"
			class="peer sr-only"
			aria-label={label}
			disabled={uploading}
			onchange={onPicked}
		/>
		<span class="inline-flex items-center justify-center rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-100 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lime-300 hover:bg-neutral-700 {uploading ? 'opacity-50' : 'cursor-pointer'}">{uploading ? 'Uploading…' : label}</span>
	</label>
	{#if currentKey}
		<p class="break-all font-mono text-xs text-neutral-500">Current asset: {currentKey}</p>
	{/if}
	{#if errorMessage}
		<p class="text-xs text-red-400" role="alert">{errorMessage}</p>
	{:else if error}
		<p class="text-xs text-red-400" role="alert">{error}</p>
	{/if}
</div>
