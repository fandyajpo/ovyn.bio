<script lang="ts">
	import type { PageData } from './$types';
	import Card from '#lib/components/ui/Card.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { formatDate, formatIdr } from '#lib/utils';

	let { data, form }: { data: PageData; form?: { error?: string } } = $props();

	let selected = $state<string | null>(null);
	let selectedProduct = $derived(data.products.find((product) => product.id === selected) ?? null);
</script>

<svelte:head>
	<title>Upgrade — OVYN</title>
</svelte:head>

<div class="mx-auto flex max-w-4xl flex-col gap-6">
	<div>
		<h1 class="font-[family-name:var(--font-display)] text-3xl font-bold">Plans &amp; upgrade</h1>
		<p class="mt-1 text-sm text-neutral-400">All current OVYN features are available on Free. Premium benefits will be announced later.</p>
	</div>

	{#if form?.error}
		<p class="text-sm text-red-400" role="alert">{form.error}</p>
	{/if}

	<Card class="flex flex-col gap-2 p-5">
		<p class="font-mono text-xs uppercase tracking-wider text-neutral-500">Your current plan</p>
		{#if data.plan.tier === 'premium'}
			<p class="font-[family-name:var(--font-display)] text-2xl font-bold text-lime-300">Premium</p>
			<p class="text-sm text-neutral-300">Active until {data.plan.premiumUntil ? formatDate(data.plan.premiumUntil) : '—'} · {data.plan.daysRemaining} days remaining</p>
			<p class="text-xs text-neutral-500">Premium access does not auto-renew. A successful renewal adds another 30 days.</p>
		{:else}
			<p class="font-[family-name:var(--font-display)] text-2xl font-bold text-neutral-100">Free</p>
			<p class="text-sm text-neutral-400">All current features stay available on Free, including profile customization, analytics, Discover and guilds.</p>
		{/if}
	</Card>

	<div class="grid gap-4 md:grid-cols-2">
		<Card class="flex flex-col gap-3 border-neutral-700 p-5">
			<div class="flex items-center justify-between gap-3">
				<h2 class="font-[family-name:var(--font-display)] text-xl font-semibold">Free</h2>
				{#if data.plan.tier === 'free'}<span class="sticker sticker--blue">CURRENT</span>{/if}
			</div>
			<p class="font-mono text-lg text-neutral-100">Rp 0 <span class="text-sm text-neutral-500">forever</span></p>
			<p class="text-sm leading-6 text-neutral-400">Discord sign-in, editable profile, custom avatar and wallpaper, analytics, Discover and guild access.</p>
		</Card>

		{#if data.products.length === 0}
			<Card class="flex flex-col gap-3 border-neutral-800 p-5">
				<h2 class="font-[family-name:var(--font-display)] text-xl font-semibold">Premium</h2>
				<p class="font-mono text-lg text-neutral-100">30 days</p>
				<p class="text-sm leading-6 text-neutral-400">Premium is not available for purchase yet. An admin can publish its price in the plan catalog. No automatic renewal.</p>
			</Card>
		{:else}
			{#each data.products as product (product.id)}
				<button
					type="button"
					onclick={() => (selected = product.id)}
					aria-pressed={selected === product.id}
					class="min-h-40 rounded-xl border p-5 text-left transition-colors
						{selected === product.id
						? 'border-lime-300 bg-lime-300/5'
						: 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'}"
				>
					<div class="flex items-center justify-between gap-3">
						<h2 class="font-[family-name:var(--font-display)] text-xl font-semibold">{product.name}</h2>
						{#if data.plan.tier === 'premium'}<span class="sticker sticker--lilac">RENEW MANUALLY</span>{/if}
					</div>
					{#if product.description}<p class="mt-2 text-sm text-neutral-400">{product.description}</p>{/if}
					<p class="mt-3 font-mono text-lime-300">{formatIdr(product.price)} <span class="text-neutral-500">/ 30 days</span></p>
					<p class="mt-1 text-xs text-neutral-500">One-time DOKU payment · renew manually · no auto-renewal</p>
				</button>
			{/each}
		{/if}
	</div>

	{#if data.products.length > 0}
		<form method="POST" action="/upgrade" class="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
			<input type="hidden" name="productId" value={selected ?? ''} />
			<Button type="submit" class="w-full sm:w-auto" disabled={!selected}>
				{data.plan.tier === 'premium' ? 'Renew Premium' : 'Get Premium'}
			</Button>
			{#if selectedProduct}
				<p class="text-sm text-neutral-400">
					Pay {formatIdr(selectedProduct.price)} for 30 days via bank virtual account. {data.plan.tier === 'premium' ? 'The new 30 days extend your current access.' : 'Access begins after payment is confirmed.'}
				</p>
			{/if}
		</form>
	{/if}
</div>
