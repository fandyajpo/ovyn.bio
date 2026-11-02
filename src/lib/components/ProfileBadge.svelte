<script lang="ts">
	import { cn } from '#lib/utils';
	import Badge from './ui/Badge.svelte';

	let {
		label,
		src = null,
		tone = 'lilac',
		class: className
	}: {
		label: string;
		src?: string | null;
		tone?: 'lime' | 'pink' | 'blue' | 'lilac' | 'neutral';
		class?: string;
	} = $props();
</script>

{#if src}
	<img src={src} alt={label} title={label} class={cn('inline-block size-6 shrink-0 object-contain', className)} />
{:else}
	<Badge {tone} size="xs" class={className}>{label}</Badge>
{/if}
