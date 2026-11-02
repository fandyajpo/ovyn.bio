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

	const tones = {
		lime: 'border-lime-300/45 bg-lime-300/10 text-lime-200',
		pink: 'border-pop-pink/45 bg-pop-pink/10 text-pop-pink',
		blue: 'border-pop-blue/45 bg-pop-blue/10 text-pop-blue',
		lilac: 'border-pop-lilac/45 bg-pop-lilac/10 text-pop-lilac',
		neutral: 'border-neutral-700 bg-neutral-800/60 text-neutral-300',
		warning: 'border-amber-300/45 bg-amber-300/10 text-amber-200',
		danger: 'border-red-400/45 bg-red-400/10 text-red-300'
	} as const;

	const sizes = {
		xs: 'px-2 py-0.5 text-[10px]',
		sm: 'px-2.5 py-1 text-[11px]',
		md: 'px-3 py-1.5 text-xs'
	} as const;
</script>

<span
	class={cn('ovyn-badge inline-flex max-w-full items-center gap-1.5 rounded-full border font-mono font-semibold uppercase tracking-wider', tones[tone], sizes[size], className)}
	data-tone={tone}
>
	<span class="ovyn-badge-dot" aria-hidden="true"></span>
	{@render children()}
</span>

<style>
	.ovyn-badge {
		background-image: linear-gradient(140deg, color-mix(in srgb, currentColor 10%, transparent), transparent 70%);
		box-shadow: inset 0 1px 0 color-mix(in srgb, currentColor 12%, transparent);
		line-height: 1.35;
	}

	.ovyn-badge-dot {
		width: 0.34rem;
		height: 0.34rem;
		flex: 0 0 auto;
		border-radius: 50%;
		background: var(--badge-dot, var(--color-muted));
		box-shadow: 0 0 8px color-mix(in srgb, var(--badge-dot, var(--color-muted)) 60%, transparent);
	}

	.ovyn-badge[data-tone='lime'] { --badge-dot: var(--color-accent); }
	.ovyn-badge[data-tone='pink'] { --badge-dot: var(--color-pop-pink); }
	.ovyn-badge[data-tone='blue'] { --badge-dot: var(--color-pop-blue); }
	.ovyn-badge[data-tone='lilac'] { --badge-dot: var(--color-pop-lilac); }
	.ovyn-badge[data-tone='warning'] { --badge-dot: #fbbf24; }
	.ovyn-badge[data-tone='danger'] { --badge-dot: #f87171; }
</style>
