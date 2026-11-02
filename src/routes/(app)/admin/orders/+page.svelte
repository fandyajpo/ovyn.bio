<script lang="ts">
	import type { PageData } from './$types';
	import Card from '#lib/components/ui/Card.svelte';
	import { formatDate, formatIdr } from '#lib/utils';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Sales history — OVYN Admin</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div>
		<a href="/admin" class="text-sm text-neutral-500 hover:text-lime-300">← Monetization</a>
		<h1 class="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">Sales history</h1>
		<p class="mt-1 text-neutral-400">Recent orders and DOKU payment states. Refunds are not available in the admin panel.</p>
	</div>

	<Card class="overflow-hidden">
		{#if data.orders.length === 0}
			<p class="p-8 text-center text-neutral-500">No orders recorded yet.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="font-mono text-xs uppercase text-neutral-500"><tr><th class="px-4 py-3">Date</th><th class="px-4 py-3">Product</th><th class="px-4 py-3">Buyer</th><th class="px-4 py-3">Amount</th><th class="px-4 py-3">Payment method</th><th class="px-4 py-3">Order / payment</th></tr></thead>
					<tbody class="divide-y divide-neutral-800">
						{#each data.orders as order (order.orderId)}
							<tr>
								<td class="whitespace-nowrap px-4 py-3 text-neutral-500">{formatDate(order.createdAt)}</td>
								<td class="min-w-48 px-4 py-3"><span class="block text-neutral-100">{order.productName}</span><span class="font-mono text-[10px] uppercase text-neutral-600">{order.productCategory}</span></td>
								<td class="px-4 py-3 text-neutral-400">{order.customerSlug ? `@${order.customerSlug}` : '—'}</td>
								<td class="whitespace-nowrap px-4 py-3 font-mono text-neutral-200">{formatIdr(order.amount)}</td>
								<td class="px-4 py-3 text-neutral-500">{order.paymentMethod ?? '—'}</td>
								<td class="whitespace-nowrap px-4 py-3"><span class="text-neutral-300">{order.orderStatus}</span><span class="text-neutral-600"> / {order.paymentStatus ?? 'no payment'}</span></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Card>
</div>
