<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils';

	let {
		class: className,
		interactive = false,
		children
	}: { class?: string; interactive?: boolean; children: Snippet } = $props();
</script>

<div class={cn('ovyn-surface', interactive && 'ovyn-surface--interactive', className)}>
	{@render children()}
</div>

<style>
	.ovyn-surface {
		position: relative;
		border: 1px solid var(--color-divider);
		border-radius: 1.5rem;
		background: color-mix(in srgb, var(--color-surface) 86%, transparent);
		box-shadow: var(--shadow-card);
		transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
	}

	.ovyn-surface--interactive { cursor: pointer; }

	@media (hover: hover) and (pointer: fine) {
		.ovyn-surface--interactive:hover {
			border-color: color-mix(in srgb, var(--color-accent) 30%, transparent);
			box-shadow: var(--shadow-card-hover);
			transform: translateY(-3px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.ovyn-surface { transition: none; }
	}
</style>
