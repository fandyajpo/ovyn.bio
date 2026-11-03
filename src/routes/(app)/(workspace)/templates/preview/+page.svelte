<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import TemplateBlocks from '#lib/components/TemplateBlocks.svelte';
	import { subscribePreview, type PreviewSnapshot } from '#lib/template-preview';
	import { normalizeTemplateBlocks, type TemplateBlock } from '#lib/schemas/templates';
	import { formatRelativeTime } from '#lib/utils/date';

	let blocks = $state<TemplateBlock[]>([]);
	let updatedAt = $state<number | null>(null);
	let connected = $state(false);

	const key = $derived(page.url.searchParams.get('key') ?? '');

	onMount(() => {
		const previewKey = key;
		if (!previewKey) return;
		return subscribePreview(previewKey, (snapshot: PreviewSnapshot) => {
			blocks = normalizeTemplateBlocks(snapshot.blocks);
			updatedAt = snapshot.updatedAt;
			connected = true;
		});
	});

	const updatedLabel = $derived(updatedAt ? formatRelativeTime(updatedAt) : '');
</script>

<svelte:head>
	<title>Template preview - ovyn</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="preview-shell">
	<header class="preview-head">
		<div>
			<span class="sticker sticker--lilac">LIVE PREVIEW</span>
			<h1 class="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold">Template preview</h1>
			<p class="mt-1 text-sm text-neutral-400">This tab follows the layout editor in real time. Keep both open.</p>
		</div>
		<span class="preview-state {connected ? 'is-live' : ''}">{connected ? 'Live' : 'Waiting'}</span>
	</header>

	{#if !key}
		<p class="preview-empty">Open this page from the layout editor with the preview button.</p>
	{:else if blocks.length === 0}
		<p class="preview-empty">Waiting for the editor to send blocks…</p>
	{:else}
		<section class="preview-stage" aria-label="Template preview">
			<TemplateBlocks {blocks} />
		</section>
	{/if}

	<p class="preview-note">
		{#if updatedLabel}
			Last update {updatedLabel}. Stored in this browser, so a refresh keeps the last state.
		{:else}
			Changes appear as you edit, debounced to avoid flooding the tab.
		{/if}
	</p>
</div>

<style>
	.preview-shell {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.preview-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.preview-state {
		border: 1px solid var(--color-divider);
		border-radius: 999px;
		padding: 0.3rem 0.75rem;
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.65rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.preview-state.is-live {
		border-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
		background: var(--color-accent-soft);
		color: var(--color-accent);
	}

	.preview-empty {
		border: 1px dashed var(--color-divider);
		border-radius: 1.1rem;
		padding: 1.5rem 1rem;
		color: var(--color-muted);
		font-size: 0.85rem;
		text-align: center;
	}

	.preview-stage {
		border: 1px solid var(--color-divider);
		border-radius: 1.5rem;
		background: color-mix(in srgb, var(--color-surface) 55%, transparent);
		padding: clamp(1rem, 3vw, 2rem);
	}

	.preview-stage :global(.page-blocks) { margin-top: 0; }
	.preview-note { color: var(--color-muted); font-size: 0.72rem; }
</style>
