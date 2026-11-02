<script lang="ts">
	import { page } from '$app/state';
	import Modal from './ui/Modal.svelte';
	import { helpForPath } from '#lib/page-help';

	let open = $state(false);
	// The layout builder and its preview own the bottom-right corner.
	const help = $derived(
		page.url.pathname.startsWith('/templates/') ? null : helpForPath(page.url.pathname)
	);

	function toggle() {
		open = !open;
	}
</script>

{#if help}
	<button
		type="button"
		class="page-help-trigger"
		onclick={toggle}
		aria-label={`About this page: ${help.title}`}
		title={`About this page: ${help.title}`}
	>?</button>

	<Modal bind:open title={help.title} description={help.summary} class="page-help-modal">
		<ul class="page-help-list">
			{#each help.tips as tip (tip)}
				<li>{tip}</li>
			{/each}
		</ul>
	</Modal>
{/if}

<style>
	.page-help-trigger {
		position: fixed;
		z-index: 45;
		right: max(1rem, env(safe-area-inset-right));
		bottom: max(1rem, env(safe-area-inset-bottom));
		display: grid;
		width: 2.5rem;
		height: 2.5rem;
		place-items: center;
		border: 1px solid var(--color-divider);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-surface) 88%, transparent);
		color: var(--color-muted);
		font-family: var(--font-display);
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		backdrop-filter: blur(10px);
		transition: color 160ms ease, border-color 160ms ease, transform 160ms ease;
	}

	.page-help-trigger:hover {
		border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
		color: var(--color-accent);
		transform: translateY(-2px);
	}

	.page-help-list {
		display: grid;
		gap: 0.6rem;
		padding-left: 1.1rem;
		color: var(--color-muted);
		font-size: 0.85rem;
		line-height: 1.65;
		list-style: disc;
	}

	.page-help-list ::marker { color: var(--color-accent); }

	@media (prefers-reduced-motion: reduce) {
		.page-help-trigger { transition: none; }
	}
</style>
