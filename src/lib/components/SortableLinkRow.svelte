<script lang="ts">
	import type { Snippet } from 'svelte';
	import { createSortable } from '@dnd-kit/svelte/sortable';
	import Card from './ui/Card.svelte';

	let {
		id,
		index,
		label,
		onarrow,
		children
	}: {
		id: string;
		index: number;
		label: string;
		onarrow: (direction: -1 | 1) => void;
		children?: Snippet;
	} = $props();

	// dnd-kit needs one sortable instance per row, so every link card lives in
	// its own component and keeps a stable identity across reorders.
	const sortable = createSortable({
		get id() {
			return id;
		},
		get index() {
			return index;
		}
	});

	// The pointer drag is dnd-kit's; the arrow keys stay here so a handle that
	// only has keyboard focus can still move its link.
	function onKeydown(event: KeyboardEvent) {
		if (sortable.isDragging) return;
		if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
		event.preventDefault();
		onarrow(event.key === 'ArrowUp' ? -1 : 1);
	}
</script>

<div
	class="link-row"
	class:is-dragging={sortable.isDragging}
	class:is-over={sortable.isDropTarget}
	{@attach sortable.attach}
>
	<Card class="min-w-0 p-4">
		<div class="flex items-start gap-3">
			<button
				type="button"
				class="drag-handle"
				aria-label="Reorder {label}"
				onkeydown={onKeydown}
				{@attach sortable.attachHandle}
			>
				<svg viewBox="0 0 16 24" aria-hidden="true" width="10" height="16">
					<circle cx="5" cy="5" r="1.4" fill="currentColor" />
					<circle cx="11" cy="5" r="1.4" fill="currentColor" />
					<circle cx="5" cy="12" r="1.4" fill="currentColor" />
					<circle cx="11" cy="12" r="1.4" fill="currentColor" />
					<circle cx="5" cy="19" r="1.4" fill="currentColor" />
					<circle cx="11" cy="19" r="1.4" fill="currentColor" />
				</svg>
			</button>

			<div class="min-w-0 flex-1">
				{@render children?.()}
			</div>
		</div>
	</Card>
</div>

<style>
	.link-row.is-dragging :global(.ovyn-surface) {
		border-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
		box-shadow: 0 18px 40px rgb(0 0 0 / 16%);
	}

	.link-row.is-over :global(.ovyn-surface) {
		border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
	}

	.drag-handle {
		display: grid;
		width: 2.4rem;
		height: 2.75rem;
		flex: 0 0 auto;
		place-items: center;
		border: 1px solid var(--color-divider);
		border-radius: 0.7rem;
		background: color-mix(in srgb, var(--color-surface) 70%, transparent);
		color: var(--color-muted);
		cursor: grab;
		touch-action: none;
		transition: color 160ms ease, border-color 160ms ease, background-color 160ms ease;
	}

	.drag-handle:hover {
		border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
		color: var(--color-foreground);
	}

	.drag-handle:active { cursor: grabbing; }

	.drag-handle:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--color-accent) 60%, transparent);
		outline-offset: 2px;
	}

	@media (prefers-reduced-motion: reduce) {
		.drag-handle { transition: none; }
	}
</style>
