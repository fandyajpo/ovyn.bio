<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils';

	let {
		class: className,
		children
	}: { class?: string; children: Snippet } = $props();
</script>

<div class={cn('rounded-xl border border-neutral-800 bg-neutral-900/50', className)}>
	{@render children()}
</div>
