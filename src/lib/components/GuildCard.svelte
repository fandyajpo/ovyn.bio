<script lang="ts">
	import Card from './ui/Card.svelte';

	let {
		slug,
		name,
		description,
		memberCount,
		visibility,
		canJoin = true,
		joined = false,
		onjoin
	}: {
		slug: string;
		name: string;
		description: string | null;
		memberCount: number;
		visibility: 'public' | 'private';
		canJoin?: boolean;
		joined?: boolean;
		onjoin?: () => void;
	} = $props();
</script>

<Card class="flex h-full flex-col justify-between gap-4 p-5">
	<div>
		<div class="flex items-center justify-between gap-2">
			<a href="/guild/{slug}" class="text-lg font-semibold text-neutral-100 hover:text-lime-300">
				{name}
			</a>
			<span
				class="rounded-full border px-2 py-0.5 text-xs
				{visibility === 'public'
					? 'border-lime-300/40 text-lime-300'
					: 'border-neutral-700 text-neutral-400'}"
			>
				{visibility}
			</span>
		</div>
		{#if description}
			<p class="mt-1 line-clamp-2 text-sm text-neutral-400">{description}</p>
		{/if}
		<p class="mt-2 font-mono text-xs text-neutral-500">{memberCount} member{memberCount === 1 ? '' : 's'}</p>
	</div>

	{#if joined}
		<span class="text-sm font-medium text-lime-300">Your guild</span>
	{:else if visibility === 'private'}
		<span class="text-sm text-neutral-500">Invite only</span>
	{:else if canJoin}
		<button
			type="button"
			class="w-full rounded-lg bg-lime-300 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-50"
			onclick={onjoin}
		>
			Join guild
		</button>
	{:else}
		<span class="text-sm text-neutral-500">Leave your current guild first to join this one</span>
	{/if}
</Card>
