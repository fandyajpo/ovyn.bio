<script lang="ts">
	import type { PageData } from './$types';
	import Card from '#lib/components/ui/Card.svelte';
	import Button from '#lib/components/ui/Button.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>My badges — OVYN</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div>
		<span class="sticker sticker--lilac">YOUR COLLECTION</span>
		<h1 class="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">Badges</h1>
		<p class="mt-1 text-neutral-400">Badges you own are ready to equip from your profile settings.</p>
	</div>

	{#if data.badges.length === 0}
		<Card class="flex flex-col items-start gap-4 p-8">
			<p class="text-neutral-300">No badges yet. Browse the shop to find one that fits your page.</p>
			<Button href="/shop">Visit the shop</Button>
		</Card>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.badges as badge (badge.id)}
				<Card class="flex items-center gap-4 p-5">
					<img src={badge.assetUrl} alt="" class="size-16 object-contain" />
					<p class="font-medium text-neutral-100">{badge.name}</p>
				</Card>
			{/each}
		</div>
	{/if}
</div>
