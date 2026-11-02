<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils';

	let {
		tone = 'neutral',
		size = 'sm',
		class: className,
		children
	}: {
		tone?: 'lime' | 'pink' | 'blue' | 'lilac' | 'neutral' | 'warning' | 'danger';
		size?: 'xs' | 'sm' | 'md';
		class?: string;
		children: Snippet;
	} = $props();

	const sizes = {
		xs: 'px-2 py-0.5 text-[10px]',
		sm: 'px-2.5 py-1 text-[11px]',
		md: 'px-3 py-1.5 text-xs'
	} as const;
</script>

<span
	class={cn('ovyn-badge inline-flex max-w-full items-center gap-1.5 rounded-full border font-mono font-semibold uppercase tracking-wider', sizes[size], className)}
	data-tone={tone}
>
	<span class="ovyn-badge-dot" aria-hidden="true"></span>
	{@render children()}
</span>

<style>
	.ovyn-badge {
		--badge-dot: var(--color-muted);
		border-color: color-mix(in srgb, var(--badge-dot) 38%, transparent);
		background-color: color-mix(in srgb, var(--badge-dot) 12%, var(--color-surface));
		color: color-mix(in srgb, var(--badge-dot) 74%, var(--color-foreground));
		background-image: linear-gradient(140deg, color-mix(in srgb, var(--badge-dot) 10%, transparent), transparent 72%);
		box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-foreground) 10%, transparent);
		line-height: 1.35;
	}

	.ovyn-badge-dot {
		width: 0.34rem;
		height: 0.34rem;
		flex: 0 0 auto;
		border-radius: 50%;
		background: var(--badge-dot);
		box-shadow: 0 0 8px color-mix(in srgb, var(--badge-dot) 55%, transparent);
	}

	.ovyn-badge[data-tone='lime'] { --badge-dot: var(--color-accent); }
	.ovyn-badge[data-tone='pink'] { --badge-dot: var(--color-pop-pink); }
	.ovyn-badge[data-tone='blue'] { --badge-dot: var(--color-pop-blue); }
	.ovyn-badge[data-tone='lilac'] { --badge-dot: var(--color-pop-lilac); }
	.ovyn-badge[data-tone='warning'] { --badge-dot: var(--color-warning); }
	.ovyn-badge[data-tone='danger'] { --badge-dot: var(--color-danger); }
</style>
