<script lang="ts">
	import { createSortable } from '@dnd-kit/svelte/sortable';

	let { index }: { index: number } = $props();

	// A sortable parked at the list's length: it can never be picked up, but it
	// gives dropped blocks and palette chips the index that appends them.
	const sortable = createSortable({
		id: 'block-end',
		get index() {
			return index;
		},
		disabled: { draggable: true }
	});
</script>

<div
	class="drop-end"
	class:is-over={sortable.isDropTarget}
	role="group"
	aria-label="Drop here to add at the end"
	{@attach sortable.attach}
>
	Drop here to add at the end
</div>

<style>
	.drop-end {
		display: grid;
		min-height: 3.2rem;
		place-items: center;
		margin-top: 0.75rem;
		border: 1px dashed var(--color-divider);
		border-radius: 1rem;
		color: var(--color-muted);
		font-size: 0.72rem;
		transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease;
	}

	.drop-end.is-over {
		border-color: color-mix(in srgb, var(--color-accent) 62%, transparent);
		background: var(--color-accent-soft);
		color: var(--color-accent);
	}

	@media (prefers-reduced-motion: reduce) {
		.drop-end { transition: none; }
	}
</style>
