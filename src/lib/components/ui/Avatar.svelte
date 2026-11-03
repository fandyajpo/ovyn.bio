<script lang="ts">
	import { cn } from '#lib/utils';

	let {
		name,
		size = 'md',
		src = null,
		class: className
	}: {
		name: string;
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
		src?: string | null;
		class?: string;
	} = $props();

	const sizes = {
		xs: 'size-6 text-[10px]',
		sm: 'size-8 text-xs',
		md: 'size-10 text-sm',
		lg: 'size-16 text-lg',
		xl: 'size-24 text-2xl'
	} as const;

	const pixelSizes = { xs: 24, sm: 32, md: 40, lg: 64, xl: 96 } as const;

	const initial = $derived(name?.trim()?.charAt(0)?.toUpperCase() ?? '?');

	// A broken or unsupported image falls back to the initial instead of
	// rendering an empty circle.
	let failed = $state(false);
	$effect(() => {
		void src;
		failed = false;
	});
</script>

{#if src && !failed}
	<img
		{src}
		alt={name}
		width={pixelSizes[size]}
		height={pixelSizes[size]}
		onerror={() => (failed = true)}
		class={cn('rounded-full object-cover bg-neutral-800 select-none', sizes[size], className)}
	/>
{:else}
	<span
		aria-hidden="true"
		class={cn(
			'flex items-center justify-center rounded-full bg-neutral-800 font-medium text-neutral-300 select-none',
			sizes[size],
			className
		)}
	>
		{initial}
	</span>
{/if}