<script lang="ts">
	import type { Snippet } from 'svelte';
	import { createSortable } from '@dnd-kit/svelte/sortable';
	import { TEMPLATE_BLOCK_LABELS, type TemplateBlock } from '#lib/schemas/templates';

	let {
		block,
		index,
		total,
		onmove,
		onduplicate,
		onremove,
		children
	}: {
		block: TemplateBlock;
		index: number;
		total: number;
		onmove: (direction: -1 | 1) => void;
		onduplicate: () => void;
		onremove: () => void;
		children?: Snippet;
	} = $props();

	// One sortable per block, with the index read through a getter so the
	// instance follows the list as it reorders.
	const sortable = createSortable({
		get id() {
			return block.id;
		},
		get index() {
			return index;
		}
	});
</script>

<article
	class="block-card"
	class:is-dragging={sortable.isDragging}
	class:is-over={sortable.isDropTarget}
	{@attach sortable.attach}
>
	<header class="block-head">
		<button
			type="button"
			class="block-handle"
			aria-label="Reorder {TEMPLATE_BLOCK_LABELS[block.type]} block"
			{@attach sortable.attachHandle}
		>
			⠿
		</button>
		<span class="block-label">{TEMPLATE_BLOCK_LABELS[block.type]}</span>
		<div class="block-tools">
			<button type="button" onclick={() => onmove(-1)} disabled={index === 0} aria-label="Move block up">↑</button>
			<button type="button" onclick={() => onmove(1)} disabled={index === total - 1} aria-label="Move block down">↓</button>
			<button type="button" onclick={onduplicate}>Duplicate</button>
			<button type="button" class="block-remove" onclick={onremove}>Remove</button>
		</div>
	</header>

	<div class="block-body">
		{@render children?.()}
	</div>
</article>

<style>
	.block-card {
		border: 1px solid var(--color-divider);
		border-radius: 1.15rem;
		background: color-mix(in srgb, var(--color-surface) 74%, transparent);
		transition: border-color 160ms ease, box-shadow 180ms ease;
	}

	.block-card.is-over {
		border-color: color-mix(in srgb, var(--color-accent) 70%, transparent);
		box-shadow: 0 0 0 4px var(--color-accent-soft);
	}

	.block-card.is-dragging {
		border-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
		box-shadow: 0 18px 40px rgb(0 0 0 / 16%);
	}

	.block-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
		border-bottom: 1px solid var(--color-divider);
		padding: 0.6rem 0.8rem;
	}

	.block-handle {
		display: grid;
		width: 1.9rem;
		height: 1.7rem;
		flex: 0 0 auto;
		place-items: center;
		border: 1px solid transparent;
		border-radius: 0.45rem;
		background: transparent;
		padding: 0;
		color: var(--color-muted);
		font: inherit;
		font-size: 0.8rem;
		letter-spacing: 0.1em;
		cursor: grab;
		touch-action: none;
		transition: color 140ms ease, border-color 140ms ease;
	}

	.block-handle:hover {
		border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
		color: var(--color-foreground);
	}

	.block-handle:active { cursor: grabbing; }

	.block-handle:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--color-accent) 60%, transparent);
		outline-offset: 2px;
	}

	.block-label { color: var(--color-foreground); font-size: 0.75rem; font-weight: 600; letter-spacing: 0.02em; }
	.block-tools { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-left: auto; }

	.block-tools button {
		min-height: 1.9rem;
		border: 1px solid var(--color-divider);
		border-radius: 0.55rem;
		background: transparent;
		padding: 0.2rem 0.55rem;
		color: var(--color-muted);
		font: inherit;
		font-size: 0.68rem;
		cursor: pointer;
		transition: color 140ms ease, border-color 140ms ease, background-color 140ms ease;
	}

	.block-tools button:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--color-accent) 42%, transparent);
		background: var(--color-accent-soft);
		color: var(--color-foreground);
	}

	.block-tools button:disabled { cursor: not-allowed; color: var(--color-muted); }
	.block-remove:hover { border-color: color-mix(in srgb, var(--color-danger) 50%, transparent); color: var(--color-danger); }

	.block-body {
		display: grid;
		gap: 0.7rem;
		padding: 0.85rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.block-card,
		.block-handle,
		.block-tools button { transition: none; }
	}
</style>
