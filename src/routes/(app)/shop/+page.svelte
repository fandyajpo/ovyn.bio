<script lang="ts">
	import { untrack } from 'svelte';
	import type { PageData } from './$types';
	import Card from '#lib/components/ui/Card.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import DropdownSelect from '#lib/components/ui/DropdownSelect.svelte';
	import CosmeticPreview from '#lib/components/CosmeticPreview.svelte';
	import { formatIdr } from '#lib/utils';
	import { formatDay } from '#lib/utils/date';

	let { data, form }: { data: PageData; form?: { error?: string } } = $props();

	const KINDS = ['frame', 'wallpaper', 'badge'] as const;
	type Kind = (typeof KINDS)[number];
	const KIND_LABEL = { frame: 'Avatar frame', wallpaper: 'Wallpaper', badge: 'Badge' } as const;

	const ownedGroups = $derived(
		KINDS.map((kind) => {
			const owned = data.items.filter((item) => item.kind === kind && item.owned);
			return {
				kind,
				label: KIND_LABEL[kind],
				items: owned,
				equipped: owned.find((item) => item.equipped) ?? null
			};
		})
	);

	const wishlist = $derived(data.items.filter((item) => !item.owned));

	let selected = $state<Record<Kind, string>>(
		untrack(() => ({
			frame: data.items.find((item) => item.kind === 'frame' && item.equipped)?.id ?? '',
			wallpaper: data.items.find((item) => item.kind === 'wallpaper' && item.equipped)?.id ?? '',
			badge: data.items.find((item) => item.kind === 'badge' && item.equipped)?.id ?? ''
		}))
	);
</script>

<svelte:head>
	<title>Shop - ovyn</title>
</svelte:head>

<div class="flex flex-col gap-8">
	<div>
		<span class="sticker sticker--pink">PROFILE ACCESSORIES</span>
		<h1 class="mt-4 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight">The little flex shop.</h1>
		<p class="mt-2 text-neutral-400">
			Frames, wallpapers, and badges to make your page feel like yours. Buy with DOKU or redeem with points.
		</p>
	</div>

	{#if form?.error}
		<p class="rounded-lg border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300" role="alert">
			{form.error}
		</p>
	{/if}

	{#if ownedGroups.some((group) => group.items.length > 0)}
		<section class="flex flex-col gap-4">
			<div>
				<h2 class="font-[family-name:var(--font-display)] text-2xl font-bold">Your accessories</h2>
				<p class="mt-1 text-sm text-neutral-400">Pick what you are wearing. Changes show up on your public page right away.</p>
			</div>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each ownedGroups as group (group.kind)}
					<Card class="collage-card flex h-full flex-col gap-3 p-5">
						<div class="flex items-baseline justify-between gap-2">
							<h3 class="font-medium text-neutral-100">{group.label}</h3>
							<span class="font-mono text-xs text-neutral-500">{group.items.length} owned</span>
						</div>

						{#if group.equipped}
							<CosmeticPreview
								kind={group.kind}
								name={group.equipped.name}
								assetUrl={group.equipped.assetUrl}
								accentColor={group.equipped.accentColor}
							/>
						{:else}
							<p class="rounded-lg border border-dashed border-neutral-700 px-3 py-6 text-center text-xs text-neutral-500">
								Nothing equipped
							</p>
						{/if}

						{#if group.items.length === 0}
							<p class="text-sm text-neutral-500">You do not own any of these yet.</p>
						{:else}
							<form method="POST" action="/shop?/equip" class="mt-auto flex flex-col gap-3">
								<input type="hidden" name="kind" value={group.kind} />
								<DropdownSelect
									name="cosmeticId"
									label="Wearing"
									options={[
										{ value: '', label: 'None' },
										...group.items.map((item) => ({ value: item.id, label: item.name }))
									]}
									bind:value={selected[group.kind]}
								/>
								<Button type="submit" variant="primary" class="w-full">Save {group.label.toLowerCase()}</Button>
							</form>
						{/if}
					</Card>
				{/each}
			</div>
		</section>
	{/if}

	<section class="flex flex-col gap-4">
		<div class="flex items-baseline justify-between gap-3">
			<h2 class="font-[family-name:var(--font-display)] text-2xl font-bold">In the shop</h2>
			<span class="font-mono text-xs text-neutral-500">{wishlist.length} available</span>
		</div>

		{#if wishlist.length === 0}
			<Card class="p-10 text-center text-neutral-500">
				{data.items.length === 0 ? 'No items in the shop yet. Check back soon.' : 'You own everything in the shop. Nice.'}
			</Card>
		{:else}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each wishlist as item (item.id)}
					<Card class="collage-card flex h-full flex-col gap-3 p-5">
						<CosmeticPreview
							kind={item.kind}
							name={item.name}
							assetUrl={item.assetUrl}
							accentColor={item.accentColor}
							limited={item.stockLimit !== null || Boolean(item.dropEndsAt)}
						/>

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
								{#if item.dropEndsAt} · ends {formatDay(item.dropEndsAt)}{/if}
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

							{#if !item.dropOpen || item.remainingStock === 0}
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
					</Card>
				{/each}
			</div>
		{/if}
	</section>
</div>
