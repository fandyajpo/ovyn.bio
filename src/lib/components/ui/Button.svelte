<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	let {
		variant = 'primary',
		type = 'button',
		href,
		disabled = false,
		loading = false,
		class: className,
		children
	}: {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		type?: 'button' | 'submit';
		href?: string;
		disabled?: boolean;
		loading?: boolean;
		class?: string;
		children: Snippet;
	} = $props();

	const styles = {
		primary: 'bg-lime-300 text-neutral-950 hover:bg-lime-200 focus-visible:outline-lime-300',
		secondary: 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700 focus-visible:outline-neutral-500',
		ghost: 'bg-transparent text-neutral-300 hover:bg-neutral-800/60 hover:text-neutral-100',
		danger: 'bg-transparent text-red-400 border border-red-900/60 hover:bg-red-950/40'
	} as const;

	const base =
		'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

	const isDisabled = $derived(disabled || loading);
</script>

{#if href && !isDisabled}
	<a {href} class={cn(base, styles[variant], className)}>{children}</a>
{:else}
	<button
		{type}
		class={cn(base, styles[variant], className)}
		disabled={isDisabled}
		aria-busy={loading}
	>
		{#if loading}
			<span
				class="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
				aria-hidden="true"></span>
		{/if}
		{children}
	</button>
{/if}
