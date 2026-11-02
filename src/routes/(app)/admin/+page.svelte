<script lang="ts">
	import type { PageData } from './$types';
	import Card from '#lib/components/ui/Card.svelte';
	import { formatDate, formatIdr } from '#lib/utils';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Monetization admin — OVYN</title>
</svelte:head>

<div class="flex flex-col gap-8">
	<div>
		<p class="font-mono text-xs uppercase tracking-widest text-lime-300">Admin</p>
		<h1 class="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold">Monetization</h1>
		<p class="mt-1 text-neutral-400">Manage catalog listings and review payment activity.</p>
	</div>

	<div class="responsive-grid-container">
		<div class="adaptive-stats grid gap-4">
			<Card class="p-5"><p class="font-mono text-xs uppercase text-neutral-500">Catalog items</p><p class="mt-2 text-2xl font-bold">{data.overview.products}</p></Card>
			<Card class="p-5"><p class="font-mono text-xs uppercase text-neutral-500">Active listings</p><p class="mt-2 text-2xl font-bold">{data.overview.activeProducts}</p></Card>
			<Card class="p-5"><p class="font-mono text-xs uppercase text-neutral-500">Successful payments</p><p class="mt-2 text-2xl font-bold">{data.overview.paidOrders}</p></Card>
			<Card class="p-5"><p class="font-mono text-xs uppercase text-neutral-500">Recorded paid total</p><p class="mt-2 text-2xl font-bold text-lime-300">{formatIdr(data.overview.paidRevenue)}</p></Card>
		</div>
	</div>

	<div class="flex flex-wrap gap-3">
		<a href="/admin/catalog" class="rounded-lg bg-lime-300 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-lime-200">Manage catalog</a>
		<a href="/admin/orders" class="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800">View sales</a>
	</div>

	<Card class="overflow-hidden">
		<div class="border-b border-neutral-800 px-5 py-4">
			<h2 class="font-medium text-neutral-100">Recent orders</h2>
			<p class="mt-1 text-xs text-neutral-500">Payment details are read-only here; payment state is verified by DOKU webhooks/status checks.</p>
		</div>
		{#if data.overview.recentOrders.length === 0}
			<p class="p-5 text-sm text-neutral-500">No orders yet.</p>
		{:else}
			<div class="grid gap-3 p-3 lg:hidden">
				{#each data.overview.recentOrders as order (order.orderId)}
					<article class="rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0"><h3 class="truncate font-medium text-neutral-100">{order.productName}</h3><p class="mt-1 truncate text-sm text-neutral-400">{order.customerSlug ? `@${order.customerSlug}` : 'Profile unavailable'}</p></div>
							<p class="shrink-0 font-mono text-sm text-neutral-200">{formatIdr(order.amount)}</p>
						</div>
						<dl class="mt-4 grid grid-cols-2 gap-3 border-t border-neutral-800 pt-3 text-sm">
							<div><dt class="text-xs text-neutral-500">Payment status</dt><dd class="mt-1 text-neutral-300">{order.paymentStatus ?? order.orderStatus}</dd></div>
							<div><dt class="text-xs text-neutral-500">Date</dt><dd class="mt-1 text-neutral-400">{formatDate(order.createdAt)}</dd></div>
						</dl>
					</article>
				{/each}
			</div>
			<div class="hidden overflow-x-auto lg:block">
				<table class="w-full min-w-[48rem] text-left text-sm">
					<thead class="font-mono text-xs uppercase text-neutral-500"><tr><th scope="col" class="px-5 py-3">Item</th><th scope="col" class="px-5 py-3">Buyer</th><th scope="col" class="px-5 py-3">Amount</th><th scope="col" class="px-5 py-3">Status</th><th scope="col" class="px-5 py-3">Date</th></tr></thead>
					<tbody class="divide-y divide-neutral-800">
						{#each data.overview.recentOrders as order (order.orderId)}
							<tr><td class="px-5 py-3 text-neutral-200">{order.productName}</td><td class="px-5 py-3 text-neutral-400">{order.customerSlug ? `@${order.customerSlug}` : 'Profile unavailable'}</td><td class="px-5 py-3 font-mono">{formatIdr(order.amount)}</td><td class="px-5 py-3"><span class="text-neutral-300">{order.paymentStatus ?? order.orderStatus}</span></td><td class="px-5 py-3 text-neutral-500">{formatDate(order.createdAt)}</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Card>
</div>
