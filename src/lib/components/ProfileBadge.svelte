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
	<span class={cn('profile-badge-art', className)} title={label}>
		<img src={src} alt={label} />
	</span>
{:else}
	<Badge {tone} size="xs" class={className}>{label}</Badge>
{/if}

<style>
	.profile-badge-art {
		display: inline-grid;
		width: 1.7rem;
		height: 1.7rem;
		flex: 0 0 auto;
		place-items: center;
		border: 1px solid var(--color-divider);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-surface) 78%, transparent);
		padding: 0.12rem;
		vertical-align: middle;
		box-shadow: 0 2px 10px rgb(0 0 0 / 14%);
	}

	.profile-badge-art img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
</style>
