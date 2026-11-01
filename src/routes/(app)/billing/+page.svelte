<script lang="ts">
	import type { PageData } from './$types';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { formatIdr } from '$lib/utils';

	let { data, form }: { data: PageData; form?: { error?: string } } = $props();

	let selected = $state<string | null>(null);
	let selectedProduct = $derived(data.products.find((p) => p.id === selected) ?? null);
</script>

<svelte:head>
	<title>Plans &amp; billing — OVYN</title>
</svelte:head>

<div class="mx-auto flex max-w-3xl flex-col gap-6">
	<h1 class="font-[family-name:var(--font-display)] text-3xl font-bold">Plans &amp; billing</h1>

	{#if form?.error}
		<p class="text-sm text-red-400" role="alert">{form.error}</p>
	{/if}

	{#if data.products.length === 0}
		<Card class="p-10 text-center text-neutral-500">
			No plans are available yet. Pricing is being finalized.
		</Card>
	{:else}
		<div class="grid gap-4 sm:grid-cols-3">
			{#each data.products as product (product.id)}
				<button
					type="button"
					onclick={() => (selected = product.id)}
					class="rounded-xl border p-5 text-left transition-colors
						{selected === product.id
						? 'border-lime-300 bg-lime-300/5'
						: 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'}"
				>
					<p class="font-[family-name:var(--font-display)] text-lg font-semibold">{product.name}</p>
					{#if product.description}
						<p class="mt-1 text-sm text-neutral-400">{product.description}</p>
					{/if}
					<p class="mt-3 font-mono text-lime-300">{formatIdr(product.price)}</p>
				</button>
			{/each}
		</div>

		<form method="POST" action="/billing" class="flex items-center gap-4">
			<input type="hidden" name="productId" value={selected ?? ''} />
			<Button type="submit" disabled={!selected}>Checkout</Button>
			{#if selectedProduct}
				<p class="text-sm text-neutral-400">
					Pay {formatIdr(selectedProduct.price)} via bank virtual account (DOKU)
				</p>
			{/if}
		</form>
	{/if}
</div>
