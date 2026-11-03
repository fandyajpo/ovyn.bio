<script lang="ts">
	import { createDraggable } from '@dnd-kit/svelte';
	import {
		TEMPLATE_BLOCK_HINTS,
		TEMPLATE_BLOCK_LABELS,
		type TemplateBlockType
	} from '#lib/schemas/templates';

	let { type, onadd }: { type: TemplateBlockType; onadd: () => void } = $props();

	// The chip is both a shortcut (tap to add at the end) and a drag source the
	// block list accepts while the drag is in flight.
	const draggable = createDraggable<{ type: TemplateBlockType }>({
		get id() {
			return `block-type:${type}`;
		},
		type: 'block-type',
		get data() {
			return { type };
		}
	});
</script>

<button
	type="button"
	class="palette-chip"
	title={TEMPLATE_BLOCK_HINTS[type]}
	onclick={onadd}
	{@attach draggable.attach}
>
	<span class="palette-plus" aria-hidden="true">+</span>
	<span>{TEMPLATE_BLOCK_LABELS[type]}</span>
</button>

<style>
	.palette-chip {
		display: inline-flex;
		min-height: 2.4rem;
		align-items: center;
		gap: 0.4rem;
		border: 1px dashed color-mix(in srgb, var(--color-foreground) 22%, transparent);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-surface) 70%, transparent);
		padding: 0.4rem 0.8rem;
		color: var(--color-foreground);
		font: inherit;
		font-size: 0.76rem;
		font-weight: 600;
		cursor: grab;
		touch-action: none;
		transition: border-color 160ms ease, background-color 160ms ease;
	}

	.palette-chip:hover {
		border-color: color-mix(in srgb, var(--color-accent) 52%, transparent);
		background: var(--color-accent-soft);
	}

	.palette-chip:active { cursor: grabbing; }
	.palette-plus { color: var(--color-accent); font-size: 0.9rem; }

	@media (prefers-reduced-motion: reduce) {
		.palette-chip { transition: none; }
	}
</style>
