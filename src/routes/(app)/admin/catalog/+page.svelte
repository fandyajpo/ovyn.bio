<script lang="ts">
	import type { PageData } from './$types';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import { formatDate, formatIdr } from '#lib/utils';

	type CatalogRow = PageData['products'][number];

	let { data }: { data: PageData } = $props();

	const KIND_LABEL = { frame: 'Avatar frame', wallpaper: 'Wallpaper', badge: 'Badge' } as const;

	function typeLabel(row: CatalogRow) {
		if (row.product.category === 'plan') return 'Premium monthly';
		return row.cosmetic ? KIND_LABEL[row.cosmetic.kind] : 'Cosmetic';
	}

	function availability(row: CatalogRow) {
		if (row.product.category === 'plan') return '30 days of access';
		if (!row.cosmetic) return 'Details missing';
		const parts = [row.cosmetic.stockLimit === null ? 'Unlimited stock' : `${row.cosmetic.stockLimit} in stock`];
		if (row.cosmetic.pointsPrice !== null) parts.push(`${row.cosmetic.pointsPrice} points`);
		if (row.cosmetic.dropEndsAt) parts.push(`ends ${new Date(row.cosmetic.dropEndsAt).toLocaleDateString()}`);
		return parts.join(' · ');
	}
</script>

<svelte:head>
	<title>Catalog manager - ovyn admin</title>
</svelte:head>

<div class="mx-auto flex max-w-6xl flex-col gap-7">
	<header class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<span class="sticker sticker--blue">CATALOG</span>
			<h1 class="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">Catalog manager</h1>
			<p class="mt-1 max-w-2xl text-neutral-400">Every product you sell in one table. Price changes affect new orders only, and products are deactivated rather than deleted so purchases stay intact.</p>
		</div>
		<Button href="/admin/catalog/new">New product</Button>
	</header>

	{#if data.created}
		<p class="rounded-xl border border-lime-300/40 bg-lime-300/10 px-4 py-3 text-sm text-lime-200" role="status">Created {data.created}.</p>
	{/if}
	{#if data.updated}
		<p class="rounded-xl border border-lime-300/40 bg-lime-300/10 px-4 py-3 text-sm text-lime-200" role="status">Saved changes to {data.updated}.</p>
	{/if}

	{#if data.products.length === 0}
		<Card class="p-10 text-center">
			<p class="font-medium text-neutral-200">No catalog products yet</p>
			<p class="mt-1 text-sm text-neutral-500">Create a monthly Premium plan or a profile cosmetic to get started.</p>
			<Button href="/admin/catalog/new" variant="secondary" class="mt-4">Create the first product</Button>
		</Card>
	{:else}
		<Card class="overflow-hidden">
			<div class="grid gap-3 p-3 lg:hidden">
				{#each data.products as row (row.product.id)}
					<article class="rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<h2 class="truncate font-medium text-neutral-100">{row.product.name}</h2>
								<p class="mt-1 font-mono text-[10px] uppercase tracking-wider text-neutral-500">{typeLabel(row)}</p>
							</div>
							<Badge tone={row.product.active ? 'lime' : 'neutral'} size="xs">{row.product.active ? 'active' : 'inactive'}</Badge>
						</div>
						<p class="mt-3 font-mono text-sm text-neutral-200">{formatIdr(row.product.price)}</p>
						<p class="mt-2 text-sm text-neutral-400">{availability(row)}</p>
						<div class="mt-4 flex items-center justify-between gap-3 border-t border-neutral-800 pt-3">
							<a href="/admin/catalog/{row.product.id}" class="text-sm text-lime-300 hover:underline">Edit</a>
							<time class="font-mono text-[10px] text-neutral-500">{formatDate(row.product.updatedAt)}</time>
						</div>
					</article>
				{/each}
			</div>

			<div class="hidden overflow-x-auto lg:block">
				<table class="w-full min-w-[56rem] text-left text-sm">
					<thead class="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
						<tr>
							<th scope="col" class="px-5 py-3">Product</th>
							<th scope="col" class="px-5 py-3">Type</th>
							<th scope="col" class="px-5 py-3">Price</th>
							<th scope="col" class="px-5 py-3">Availability</th>
							<th scope="col" class="px-5 py-3">Status</th>
							<th scope="col" class="px-5 py-3">Updated</th>
							<th scope="col" class="px-5 py-3"><span class="sr-only">Actions</span></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-neutral-800">
						{#each data.products as row (row.product.id)}
							<tr>
								<td class="px-5 py-3">
									<span class="block text-neutral-100">{row.product.name}</span>
									{#if row.product.description}<span class="mt-0.5 block max-w-md truncate text-xs text-neutral-500">{row.product.description}</span>{/if}
								</td>
								<td class="px-5 py-3 text-neutral-400">{typeLabel(row)}</td>
								<td class="whitespace-nowrap px-5 py-3 font-mono text-neutral-200">{formatIdr(row.product.price)}</td>
								<td class="px-5 py-3 text-neutral-400">{availability(row)}</td>
								<td class="px-5 py-3"><Badge tone={row.product.active ? 'lime' : 'neutral'} size="xs">{row.product.active ? 'active' : 'inactive'}</Badge></td>
								<td class="whitespace-nowrap px-5 py-3 text-neutral-500">{formatDate(row.product.updatedAt)}</td>
								<td class="whitespace-nowrap px-5 py-3 text-right"><a href="/admin/catalog/{row.product.id}" class="text-sm text-lime-300 hover:underline">Edit</a></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Card>
	{/if}
</div>
