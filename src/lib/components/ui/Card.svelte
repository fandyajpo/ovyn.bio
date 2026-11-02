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
		border-radius: 1.35rem;
		background:
			radial-gradient(ellipse at 100% 0%, color-mix(in srgb, var(--color-accent) 5%, transparent), transparent 58%),
			linear-gradient(160deg, color-mix(in srgb, var(--color-surface) 92%, transparent), color-mix(in srgb, var(--color-background) 82%, transparent));
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--color-foreground) 6%, transparent),
			0 18px 44px rgb(0 0 0 / 8%);
		transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
	}

	.ovyn-surface::before {
		position: absolute;
		top: 0;
		right: 12%;
		left: 12%;
		height: 1px;
		background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-accent) 46%, transparent), transparent);
		content: '';
		pointer-events: none;
		opacity: 0.75;
	}

	.ovyn-surface--interactive { cursor: pointer; }

	@media (hover: hover) and (pointer: fine) {
		.ovyn-surface--interactive:hover {
			border-color: color-mix(in srgb, var(--color-accent) 30%, transparent);
			box-shadow:
				inset 0 1px 0 color-mix(in srgb, var(--color-foreground) 8%, transparent),
				0 24px 54px rgb(0 0 0 / 13%);
			transform: translateY(-3px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.ovyn-surface { transition: none; }
	}
</style>
