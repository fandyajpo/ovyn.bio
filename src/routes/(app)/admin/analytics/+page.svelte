<script lang="ts">
	import type { PageData } from './$types';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Tooltip from '#lib/components/ui/Tooltip.svelte';
	import { formatIdr } from '#lib/utils';

	let { data }: { data: PageData } = $props();

	const maxRevenue = Math.max(1, ...data.analytics.daily.map((day) => day.revenue));
	const maxOrders = Math.max(1, ...data.analytics.daily.map((day) => day.orders));
	const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

	function formatDay(day: string) {
		return dateFormatter.format(new Date(`${day}T00:00:00.000Z`));
	}

	function revenueHeight(revenue: number) {
		return revenue > 0 ? Math.max(4, Math.round((revenue / maxRevenue) * 100)) : 0;
	}

	function ordersHeight(orders: number) {
		return orders > 0 ? Math.max(4, Math.round((orders / maxOrders) * 100)) : 0;
	}
</script>

<svelte:head>
	<title>Sales analytics - OVYN Admin</title>
</svelte:head>

<div class="mx-auto flex max-w-6xl flex-col gap-6 sm:gap-8">
	<header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<a href="/admin" class="text-sm text-neutral-500 hover:text-lime-300">← Monetization</a>
			<div class="mt-4 flex flex-wrap items-center gap-2">
				<span class="sticker sticker--blue">OVYN / SALES SIGNAL</span>
				<Badge tone="lilac" size="xs">LAST 30 DAYS</Badge>
			</div>
			<h1 class="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">Sales analytics</h1>
			<p class="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">Daily confirmed DOKU payments and revenue, grouped by UTC date.</p>
		</div>
		<Button href="/admin/orders" variant="secondary" class="w-full sm:w-auto">All orders</Button>
	</header>

	<section class="responsive-grid-container" aria-label="Sales summary">
		<div class="adaptive-metrics grid gap-3 sm:gap-4">
			<Card class="border-pop-pink/25 bg-pop-pink/[0.04] p-4 sm:p-5">
				<div class="flex items-center justify-between gap-2">
					<p class="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Confirmed revenue</p>
					<Tooltip label="Revenue definition" content="Order amounts for payments marked successful by the payment provider, grouped by payment date in UTC." />
				</div>
				<p class="mt-3 break-words font-[family-name:var(--font-display)] text-2xl font-bold text-pop-pink sm:text-3xl">{formatIdr(data.analytics.totalRevenue)}</p>
				<p class="mt-1 text-xs text-neutral-500">Across the selected 30-day window</p>
			</Card>
			<Card class="border-pop-blue/25 bg-pop-blue/[0.04] p-4 sm:p-5">
				<p class="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Paid orders</p>
				<p class="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">{data.analytics.totalOrders}</p>
				<p class="mt-1 text-xs text-neutral-500">Successful payments only</p>
			</Card>
			<Card class="border-pop-lilac/25 bg-pop-lilac/[0.04] p-4 sm:p-5">
				<p class="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Average order</p>
				<p class="mt-3 break-words font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">{formatIdr(data.analytics.averageOrderValue)}</p>
				<p class="mt-1 text-xs text-neutral-500">Average confirmed amount</p>
			</Card>
		</div>
	</section>

	<Card class="overflow-hidden">
		<div class="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-800 px-4 py-4 sm:px-6 sm:py-5">
			<div>
				<span class="sticker sticker--pink">30 DAY PULSE</span>
				<h2 class="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold">Daily sales</h2>
				<p class="mt-1 text-sm text-neutral-500">Revenue and order volume, including days without sales.</p>
			</div>
			<div class="flex flex-wrap gap-2 text-xs">
				<span class="legend-chip"><i class="legend-dot legend-dot--revenue"></i> Revenue</span>
				<span class="legend-chip"><i class="legend-dot legend-dot--orders"></i> Orders</span>
			</div>
		</div>

		{#if data.analytics.totalOrders === 0}
			<div class="p-8 text-center sm:p-12">
				<span class="mx-auto grid size-12 place-items-center rounded-2xl bg-pop-blue/10 text-2xl text-pop-blue" aria-hidden="true">↗</span>
				<p class="mt-4 font-medium text-neutral-200">No confirmed sales in this window</p>
				<p class="mt-1 text-sm text-neutral-500">Successful payments will appear here as they arrive.</p>
			</div>
		{:else}
			<div class="chart-wrap px-3 py-5 sm:px-6 sm:py-7">
				<div class="chart" role="img" aria-label="Daily revenue and paid order chart for the last 30 days">
					<div class="chart-gridlines" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
					<div class="chart-columns">
						{#each data.analytics.daily as day, index (day.date)}
							<div class="chart-column" title="{formatDay(day.date)}: {formatIdr(day.revenue)}, {day.orders} paid orders">
								<div class="chart-bars">
									<span class="chart-bar chart-bar--revenue" style="--bar-height: {revenueHeight(day.revenue)}%"></span>
									<span class="chart-bar chart-bar--orders" style="--bar-height: {ordersHeight(day.orders)}%"></span>
								</div>
								<span class="chart-label">{index % 5 === 0 || index === data.analytics.daily.length - 1 ? formatDay(day.date) : ''}</span>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</Card>

	<Card class="overflow-hidden">
		<div class="border-b border-neutral-800 px-4 py-4 sm:px-6">
			<h2 class="font-[family-name:var(--font-display)] text-lg font-semibold">Daily breakdown</h2>
			<p class="mt-1 text-sm text-neutral-500">Values are recorded when the payment is confirmed.</p>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full min-w-[34rem] text-left text-sm">
				<thead class="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
					<tr><th scope="col" class="px-4 py-3 sm:px-6">Date (UTC)</th><th scope="col" class="px-4 py-3 sm:px-6">Paid orders</th><th scope="col" class="px-4 py-3 text-right sm:px-6">Revenue</th></tr>
				</thead>
				<tbody class="divide-y divide-neutral-800">
					{#each [...data.analytics.daily].reverse() as day (day.date)}
						<tr>
							<td class="whitespace-nowrap px-4 py-3 text-neutral-300 sm:px-6">{formatDay(day.date)}</td>
							<td class="px-4 py-3 text-neutral-300 sm:px-6">{day.orders}</td>
							<td class="whitespace-nowrap px-4 py-3 text-right font-mono text-neutral-200 sm:px-6">{formatIdr(day.revenue)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</Card>
</div>

<style>
	.legend-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		border: 1px solid var(--color-divider);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-surface) 75%, transparent);
		padding: 0.45rem 0.65rem;
		color: var(--color-muted);
	}

	.legend-dot {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 999px;
	}

	.legend-dot--revenue { background: var(--color-pop-pink); }
	.legend-dot--orders { background: var(--color-pop-blue); }

	.chart-wrap {
		position: relative;
		min-width: 0;
		overflow-x: auto;
	}

	.chart {
		position: relative;
		min-width: 42rem;
		height: 18rem;
		padding-bottom: 1.75rem;
	}

	.chart-gridlines {
		position: absolute;
		inset: 0 0 1.75rem;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

	.chart-gridlines span { border-top: 1px dashed var(--color-divider); }

	.chart-columns {
		position: relative;
		z-index: 1;
		display: grid;
		height: 100%;
		grid-template-columns: repeat(30, minmax(0, 1fr));
		gap: clamp(0.15rem, 0.8vw, 0.5rem);
	}

	.chart-column {
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: center;
		gap: 0.5rem;
	}

	.chart-bars {
		display: flex;
		width: 100%;
		height: calc(100% - 1.25rem);
		align-items: flex-end;
		justify-content: center;
		gap: 2px;
	}

	.chart-bar {
		width: min(45%, 0.9rem);
		min-height: 0;
		height: var(--bar-height);
		border-radius: 0.35rem 0.35rem 0.15rem 0.15rem;
		transition: height 220ms ease;
	}

	.chart-bar--revenue {
		background: linear-gradient(180deg, var(--color-pop-pink), color-mix(in srgb, var(--color-pop-pink) 42%, #25211f));
		box-shadow: 0 0 18px color-mix(in srgb, var(--color-pop-pink) 24%, transparent);
	}

	.chart-bar--orders {
		background: linear-gradient(180deg, var(--color-pop-blue), color-mix(in srgb, var(--color-pop-blue) 40%, #1b2426));
	}

	.chart-label {
		width: max-content;
		min-height: 1rem;
		color: var(--color-muted);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.58rem;
		white-space: nowrap;
	}

	@media (max-width: 40rem) {
		.chart { min-width: 38rem; height: 15rem; }
	}

	@media (prefers-reduced-motion: reduce) {
		.chart-bar { transition: none; }
	}
</style>
