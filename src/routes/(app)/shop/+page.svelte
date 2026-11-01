<script lang="ts">
	import type { PageData } from './$types';
	import Card from '#lib/components/ui/Card.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { formatIdr } from '#lib/utils';

	let { data, form }: { data: PageData; form?: { error?: string } } = $props();

	const KIND_LABEL = { frame: 'Avatar frame', wallpaper: 'Wallpaper', badge: 'Badge' } as const;
</script>

<svelte:head>
	<title>Shop — OVYN</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div>
		<h1 class="font-[family-name:var(--font-display)] text-3xl font-bold">Shop</h1>
		<p class="mt-1 text-neutral-400">
			Deck out your profile — frames, wallpapers and badges. Paid via DOKU.
		</p>
	</div>

	{#if form?.error}
		<p class="rounded-lg border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300" role="alert">
			{form.error}
		</p>
	{/if}

	{#if data.items.length === 0}
		<Card class="p-10 text-center text-neutral-500">Nothing in the shop yet — come back soon!</Card>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.items as item (item.id)}
				<Card class="flex h-full flex-col gap-3 p-5">
					<div
						class="relative flex h-32 items-center justify-center overflow-hidden rounded-lg bg-neutral-800/60"
					>
						{#if item.assetUrl}
							<img src={item.assetUrl} alt={item.name} class="max-h-full max-w-full object-contain" />
						{:else}
							<span
								class="size-10 rounded-full border-2"
								style="border-color: {item.accentColor ?? '#D5FF35'}"
							></span>
						{/if}
					</div>

					<div class="flex-1">
						<p class="font-medium text-neutral-100">{item.name}</p>
						<p class="font-mono text-xs text-neutral-500">{KIND_LABEL[item.kind]}</p>
						{#if item.description}
							<p class="mt-1 text-sm text-neutral-400">{item.description}</p>
						{/if}
					</div>

					{#if item.stockLimit !== null || item.dropEndsAt}
						<p class="font-mono text-xs text-amber-300">
							{#if item.remainingStock !== null}{item.remainingStock} left{/if}
							{#if item.dropEndsAt} · ends {new Date(item.dropEndsAt).toLocaleDateString()}{/if}
						</p>
					{/if}

					<div class="flex flex-wrap items-center justify-between gap-2">
						<div class="flex flex-col">
							<span class="font-mono text-lime-300">
								{item.price === 0 ? 'Free' : formatIdr(item.price)}
							</span>
							{#if item.pointsPrice !== null}
								<span class="font-mono text-xs text-neutral-400">or {item.pointsPrice} points</span>
							{/if}
						</div>

						{#if item.owned}
							<span class="rounded-full border border-lime-300/40 px-2 py-0.5 text-xs text-lime-300">
								{item.equipped ? 'Equipped' : 'Owned'}
							</span>
						{:else if !item.dropOpen || item.remainingStock === 0}
							<span class="text-xs text-neutral-500">Drop closed / sold out</span>
						{:else}
							<div class="flex flex-wrap gap-2">
								{#if item.price > 0}
									<form method="POST" action="/shop?/buy">
										<input type="hidden" name="productId" value={item.id} />
										<Button type="submit" variant="secondary">Buy</Button>
									</form>
								{/if}
								{#if item.pointsPrice !== null}
									<form method="POST" action="/shop?/redeem">
										<input type="hidden" name="cosmeticId" value={item.id} />
										<Button type="submit" variant="ghost" disabled={item.points < item.pointsPrice}>
											{item.price === 0 ? 'Claim free' : 'Redeem'}
										</Button>
									</form>
								{/if}
							</div>
						{/if}
					</div>

					{#if item.owned}
						<form method="POST" action="/shop?/equip">
							<input type="hidden" name="cosmeticId" value={item.equipped ? '' : item.id} />
							<input type="hidden" name="kind" value={item.kind} />
							<Button type="submit" variant={item.equipped ? 'ghost' : 'primary'} class="w-full">
								{item.equipped ? 'Take off' : 'Equip'}
							</Button>
						</form>
					{/if}
				</Card>
			{/each}
		</div>
	{/if}
</div>
