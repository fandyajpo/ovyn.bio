<script lang="ts">
	import Card from '#lib/components/ui/Card.svelte';
	import { formatDate, formatIdr } from '#lib/utils';

	let { data } = $props();
</script>

<svelte:head>
	<title>Payment history - OVYN</title>
</svelte:head>

<div class="mx-auto flex max-w-2xl flex-col gap-6">
	<h1 class="font-[family-name:var(--font-display)] text-3xl font-bold">Payment history</h1>

	{#if data.orders.length === 0}
		<Card class="p-10 text-center text-neutral-500">No payments yet.</Card>
	{:else}
		<Card class="overflow-hidden">
			<div class="grid gap-3 p-3 lg:hidden">
				{#each data.orders as row (row.order.id)}
					<article class="rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0"><h2 class="truncate font-medium text-neutral-100">{row.product.name}</h2><p class="mt-1 text-sm text-neutral-500">{formatDate(row.order.createdAt)}</p></div>
							<p class="shrink-0 font-mono text-sm text-neutral-200">{formatIdr(row.order.amount)}</p>
						</div>
						<a href="/checkout/{row.order.id}" class="mt-4 inline-flex min-h-11 items-center rounded-lg border border-neutral-800 px-3 text-sm hover:underline
							{row.order.status === 'paid'
								? 'text-lime-300'
								: row.order.status === 'pending'
									? 'text-amber-300'
									: 'text-neutral-500'}">
							{row.order.status}
						</a>
					</article>
				{/each}
			</div>
			<div class="hidden overflow-x-auto lg:block">
				<table class="w-full min-w-[40rem] text-sm">
					<thead>
						<tr class="border-b border-neutral-800 text-left font-mono text-xs text-neutral-500 uppercase">
							<th scope="col" class="px-4 py-3">Date</th>
							<th scope="col" class="px-4 py-3">Plan</th>
							<th scope="col" class="px-4 py-3">Amount</th>
							<th scope="col" class="px-4 py-3">Status</th>
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
			</div>
		</Card>
	{/if}
</div>
