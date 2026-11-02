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
		lime: 'border-lime-300/40 bg-lime-300/10 text-lime-200',
		pink: 'border-pop-pink/40 bg-pop-pink/10 text-pop-pink',
		blue: 'border-pop-blue/40 bg-pop-blue/10 text-pop-blue',
		lilac: 'border-pop-lilac/40 bg-pop-lilac/10 text-pop-lilac',
		neutral: 'border-neutral-700 bg-neutral-800/60 text-neutral-300',
		warning: 'border-amber-300/40 bg-amber-300/10 text-amber-200',
		danger: 'border-red-400/40 bg-red-400/10 text-red-300'
	} as const;

	const sizes = {
		xs: 'px-2 py-0.5 text-[10px]',
		sm: 'px-2.5 py-1 text-xs',
		md: 'px-3 py-1.5 text-sm'
	} as const;
</script>

<span class={cn('inline-flex max-w-full items-center gap-1.5 rounded-full border font-mono font-semibold uppercase tracking-wider', tones[tone], sizes[size], className)}>
	{@render children()}
</span>
