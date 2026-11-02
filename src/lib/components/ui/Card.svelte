<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils';

	let {
		class: className,
		children
	}: { class?: string; children: Snippet } = $props();
</script>

<div class={cn('ovyn-card rounded-2xl border bg-neutral-900/50', className)}>
	{@render children()}
</div>
