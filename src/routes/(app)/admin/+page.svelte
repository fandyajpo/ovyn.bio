<script lang="ts">
	import type { PageData } from './$types';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Tooltip from '#lib/components/ui/Tooltip.svelte';
	import { formatDate, formatIdr } from '#lib/utils';

	let { data }: { data: PageData } = $props();

	function statusTone(status: string): 'lime' | 'warning' | 'danger' | 'neutral' {
		if (['succeeded', 'paid', 'completed'].includes(status)) return 'lime';
		if (status === 'pending') return 'warning';
		if (['failed', 'cancelled', 'expired'].includes(status)) return 'danger';
		return 'neutral';
	}
</script>

<svelte:head>
	<title>Admin dashboard - ovyn</title>
</svelte:head>

<div class="flex flex-col gap-6 sm:gap-8">
	<header class="relative isolate overflow-hidden rounded-[1.75rem] border border-lime-300/20 bg-neutral-900/70 p-5 sm:p-7 lg:p-8">
		<div class="pointer-events-none absolute -right-14 -top-20 size-56 rounded-full bg-pop-pink/10 blur-3xl" aria-hidden="true"></div>
		<div class="pointer-events-none absolute -bottom-24 right-1/3 size-56 rounded-full bg-pop-blue/10 blur-3xl" aria-hidden="true"></div>
		<div class="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
			<div class="min-w-0">
				<span class="sticker sticker--pink">ovyn / control room</span>
				<h1 class="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">Monetization dashboard</h1>
				<p class="mt-2 max-w-xl text-sm leading-6 text-neutral-400 sm:text-base">A clear view of your catalog, sales, and payments in one place.</p>
				<div class="mt-4 flex flex-wrap gap-2">
					<span class="sticker sticker--dark">{data.overview.orders} total orders</span>
					<span class="sticker sticker--blue">{data.overview.pendingPayments} pending payments</span>
				</div>
			</div>
			<nav aria-label="Admin shortcuts" class="grid w-full gap-2 sm:grid-cols-3 md:w-auto">
				<Button href="/admin/catalog" class="w-full sm:w-auto">Manage catalog</Button>
				<Button href="/admin/analytics" variant="secondary" class="w-full sm:w-auto">Sales analytics</Button>
				<Button href="/admin/orders" variant="ghost" class="w-full sm:w-auto">Review sales</Button>
			</nav>
		</div>
	</header>

	<section aria-label="Monetization overview">
		<div class="mb-3 flex items-center justify-between gap-3">
			<h2 class="font-[family-name:var(--font-display)] text-xl font-semibold">At a glance</h2>
			<span class="hidden font-mono text-[10px] uppercase tracking-widest text-neutral-600 sm:inline">LIVE SNAPSHOT</span>
		</div>
		<div class="responsive-grid-container">
			<div class="adaptive-stats grid gap-3 sm:gap-4">
				<Card class="border-pop-blue/25 bg-[#151d20]/80 p-4 sm:p-5">
					<div class="flex items-start justify-between gap-3">
						<p class="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Catalog items</p>
						<span class="grid size-9 place-items-center rounded-xl bg-pop-blue/15 text-lg text-pop-blue" aria-hidden="true">◇</span>
					</div>
					<p class="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">{data.overview.products}</p>
					<p class="mt-1 text-xs text-neutral-500">{data.overview.activeProducts} available to customers</p>
				</Card>

				<Card class="border-lime-300/25 bg-lime-300/[0.04] p-4 sm:p-5">
					<div class="flex items-start justify-between gap-3">
						<p class="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Active listings</p>
						<span class="grid size-9 place-items-center rounded-xl bg-lime-300/15 text-lg text-lime-300" aria-hidden="true">✳</span>
					</div>
					<p class="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">{data.overview.activeProducts}</p>
					<p class="mt-1 text-xs text-neutral-500">{data.overview.products - data.overview.activeProducts} paused</p>
				</Card>

				<Card class="border-pop-lilac/25 bg-pop-lilac/[0.04] p-4 sm:p-5">
					<div class="flex items-start justify-between gap-3">
						<div class="flex items-center gap-2">
							<p class="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Paid orders</p>
							<Tooltip label="Paid order details" content="Orders whose DOKU payment status is marked successful." />
						</div>
						<span class="grid size-9 place-items-center rounded-xl bg-pop-lilac/15 text-lg text-pop-lilac" aria-hidden="true">↗</span>
					</div>
					<p class="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">{data.overview.paidOrders}</p>
					<p class="mt-1 text-xs text-neutral-500">{data.overview.pendingPayments} awaiting payment</p>
				</Card>

				<Card class="border-pop-pink/25 bg-pop-pink/[0.04] p-4 sm:p-5">
					<div class="flex items-start justify-between gap-3">
						<p class="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Confirmed revenue</p>
						<span class="grid size-9 place-items-center rounded-xl bg-pop-pink/15 text-lg text-pop-pink" aria-hidden="true">$</span>
					</div>
					<p class="mt-3 break-words font-[family-name:var(--font-display)] text-2xl font-bold text-pop-pink sm:text-3xl">{formatIdr(data.overview.paidRevenue)}</p>
					<p class="mt-1 text-xs text-neutral-500">From successful DOKU payments</p>
				</Card>
			</div>
		</div>
	</section>

	<div class="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(17rem,0.75fr)]">
		<Card class="overflow-hidden">
			<div class="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 px-4 py-4 sm:px-5">
				<div class="min-w-0">
					<span class="sticker sticker--blue">LATEST ACTIVITY</span>
					<h2 class="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold">Recent orders</h2>
					<p class="mt-1 text-xs text-neutral-500">Payment status is verified by DOKU.</p>
				</div>
				<Button href="/admin/orders" variant="ghost" class="shrink-0">All sales</Button>
			</div>

			{#if data.overview.recentOrders.length === 0}
				<div class="p-8 text-center sm:p-10">
					<span class="mx-auto grid size-12 place-items-center rounded-2xl bg-pop-blue/10 text-2xl text-pop-blue" aria-hidden="true">◇</span>
					<p class="mt-4 font-medium text-neutral-200">No orders yet</p>
					<p class="mt-1 text-sm text-neutral-500">New sales will show up here.</p>
				</div>
			{:else}
				<div class="grid gap-3 p-3 lg:hidden">
					{#each data.overview.recentOrders as order (order.orderId)}
						<article class="rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<h3 class="truncate font-medium text-neutral-100">{order.productName}</h3>
									<p class="mt-1 truncate text-sm text-neutral-400">{order.customerSlug ? `@${order.customerSlug}` : 'Profile unavailable'}</p>
								</div>
								<p class="shrink-0 font-mono text-sm text-neutral-200">{formatIdr(order.amount)}</p>
							</div>
							<div class="mt-4 flex items-center justify-between gap-3 border-t border-neutral-800 pt-3">
								<Badge tone={statusTone(order.paymentStatus ?? order.orderStatus)} size="xs">{order.paymentStatus ?? order.orderStatus}</Badge>
								<time class="shrink-0 font-mono text-[10px] text-neutral-500">{formatDate(order.createdAt)}</time>
							</div>
						</article>
					{/each}
				</div>
				<div class="hidden overflow-x-auto lg:block">
					<table class="w-full min-w-[48rem] text-left text-sm">
						<thead class="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
							<tr><th scope="col" class="px-5 py-3">Item</th><th scope="col" class="px-5 py-3">Buyer</th><th scope="col" class="px-5 py-3">Amount</th><th scope="col" class="px-5 py-3">Status</th><th scope="col" class="px-5 py-3">Date</th></tr>
						</thead>
						<tbody class="divide-y divide-neutral-800">
							{#each data.overview.recentOrders as order (order.orderId)}
								<tr>
									<td class="px-5 py-3 text-neutral-200">{order.productName}</td>
									<td class="px-5 py-3 text-neutral-400">{order.customerSlug ? `@${order.customerSlug}` : 'Profile unavailable'}</td>
									<td class="px-5 py-3 font-mono text-neutral-200">{formatIdr(order.amount)}</td>
									<td class="px-5 py-3"><Badge tone={statusTone(order.paymentStatus ?? order.orderStatus)} size="xs">{order.paymentStatus ?? order.orderStatus}</Badge></td>
									<td class="whitespace-nowrap px-5 py-3 text-neutral-500">{formatDate(order.createdAt)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</Card>

		<aside class="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
			<Card class="border-amber-300/20 bg-amber-300/[0.035] p-5">
				<span class="sticker sticker--pink">PAYMENT QUEUE</span>
				<p class="mt-4 font-[family-name:var(--font-display)] text-4xl font-bold">{data.overview.pendingPayments}</p>
				<p class="mt-1 text-sm text-neutral-400">payment{data.overview.pendingPayments === 1 ? '' : 's'} awaiting confirmation</p>
				<Button href="/admin/orders" variant="ghost" class="mt-4 w-full">Review payments</Button>
			</Card>

			<Card class="border-pop-blue/20 bg-pop-blue/[0.035] p-5">
				<span class="sticker sticker--blue">QUICK ACTIONS</span>
				<div class="mt-4 flex flex-col gap-2">
					<a href="/admin/catalog" class="flex min-h-11 items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950/40 px-4 text-sm text-neutral-200 transition-colors hover:border-pop-blue/40 hover:text-pop-blue">
						Manage catalog <span aria-hidden="true">↗</span>
					</a>
					<a href="/admin/orders" class="flex min-h-11 items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950/40 px-4 text-sm text-neutral-200 transition-colors hover:border-pop-pink/40 hover:text-pop-pink">
						View all sales <span aria-hidden="true">↗</span>
					</a>
					<a href="/admin/analytics" class="flex min-h-11 items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950/40 px-4 text-sm text-neutral-200 transition-colors hover:border-pop-lilac/40 hover:text-pop-lilac">
						Sales analytics <span aria-hidden="true">↗</span>
					</a>
				</div>
			</Card>
		</aside>
	</div>
</div>
