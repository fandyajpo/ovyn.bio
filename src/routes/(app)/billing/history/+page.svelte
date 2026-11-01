<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import { formatDate, formatIdr } from '$lib/utils';

	let { data } = $props();
</script>

<svelte:head>
	<title>Payment history — OVYN</title>
</svelte:head>

<div class="mx-auto flex max-w-2xl flex-col gap-6">
	<h1 class="font-[family-name:var(--font-display)] text-3xl font-bold">Payment history</h1>

	{#if data.orders.length === 0}
		<Card class="p-10 text-center text-neutral-500">No payments yet.</Card>
	{:else}
		<Card class="overflow-hidden">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-neutral-800 text-left font-mono text-xs text-neutral-500 uppercase">
						<th class="px-4 py-3">Date</th>
						<th class="px-4 py-3">Plan</th>
						<th class="px-4 py-3">Amount</th>
						<th class="px-4 py-3">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-neutral-800">
					{#each data.orders as row (row.order.id)}
						<tr class="hover:bg-neutral-800/30">
							<td class="px-4 py-3 text-neutral-400">{formatDate(row.order.createdAt)}</td>
							<td class="px-4 py-3 text-neutral-200">{row.product.name}</td>
							<td class="px-4 py-3 font-mono text-neutral-200">{formatIdr(row.order.amount)}</td>
							<td class="px-4 py-3">
								<a href="/checkout/{row.order.id}" class="hover:underline
									{row.order.status === 'paid'
									? 'text-lime-300'
									: row.order.status === 'pending'
										? 'text-amber-300'
										: 'text-neutral-500'}">
									{row.order.status}
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</Card>
	{/if}
</div>
