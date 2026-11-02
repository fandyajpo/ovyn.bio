<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import type { PageData } from './$types';
	import Card from '#lib/components/ui/Card.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { copyText, formatDate, formatIdr } from '#lib/utils';

	let { data } = $props();

	let copied = $state(false);

	type StatusResponse = { status: 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled' };

	// Poll payment status; the endpoint re-syncs from DOKU server-side.
	const statusQuery = createQuery(() => ({
		queryKey: ['payment', data.order.id],
		queryFn: async (): Promise<StatusResponse> => {
			const res = await fetch(`/api/payments/${data.order.id}/status`);
			if (!res.ok) throw new Error('Could not fetch payment status');
			return res.json();
		},
		refetchInterval: (query) => {
			const status = query.state.data?.status;
			return status === 'pending' ? 10_000 : false;
		},
		refetchIntervalInBackground: false,
		initialData: { status: data.order.status },
		staleTime: 5_000
	}));

	const status = $derived(statusQuery.data?.status ?? data.order.status);

	async function copyVa() {
		if (await copyText(data.payment.paymentCode ?? '')) {
			copied = true;
			setTimeout(() => (copied = false), 1500);
		}
	}
</script>

<svelte:head>
	<title>Checkout - OVYN</title>
</svelte:head>

<div class="mx-auto flex max-w-lg flex-col gap-6">
	<h1 class="font-[family-name:var(--font-display)] text-3xl font-bold">Complete your payment</h1>

	<Card class="flex flex-col gap-4 p-6">
		<div class="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div class="min-w-0">
				<p class="text-sm text-neutral-400">{data.product.name}</p>
				<p class="font-[family-name:var(--font-display)] text-2xl font-bold">
					{formatIdr(data.order.amount)}
				</p>
			</div>
			<span
				class="rounded-full border px-3 py-1 text-xs font-medium
					{status === 'paid'
					? 'border-lime-300/50 text-lime-300'
					: status === 'failed' || status === 'cancelled'
						? 'border-red-900 text-red-400'
						: status === 'expired'
							? 'border-neutral-700 text-neutral-400'
							: 'border-amber-500/50 text-amber-300'}"
			>
				{status}
			</span>
		</div>

		{#if status === 'pending'}
			<div class="rounded-lg bg-neutral-800/50 p-4">
				<p class="text-xs text-neutral-400">
					{data.payment.paymentMethod.startsWith('VIRTUAL_ACCOUNT')
						? 'Virtual account number'
						: 'Payment code'}
				</p>
				<div class="mt-1 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
					<p class="min-w-0 break-all font-mono text-xl tracking-wider text-lime-300">{data.payment.paymentCode}</p>
					<Button variant="secondary" class="w-full sm:w-auto" onclick={copyVa}>{copied ? 'Copied!' : 'Copy'}</Button>
				</div>
			</div>

			<ul class="text-sm text-neutral-400">
				<li>1. Open your mobile banking or ATM app.</li>
				<li>2. Choose "Virtual Account" payment and enter the number above.</li>
				<li>3. Amount must be exactly {formatIdr(data.order.amount)}.</li>
				<li>4. Pay before {formatDate(data.payment.expiresAt ?? data.order.createdAt)}.</li>
			</ul>

			<p class="text-xs text-neutral-500">
				This page updates automatically once your payment is confirmed by DOKU. You can leave and come back anytime at /checkout/{data.order.id}.
			</p>
		{:else if status === 'paid'}
			{#if data.product.category === 'plan'}
				{#if data.product.durationDays === null}
					<p class="text-lime-300">Payment received. Your Premium lifetime access is active.</p>
				{:else}
					<p class="text-lime-300">Payment received. Your {data.product.durationDays}-day legacy Premium access is active.</p>
				{/if}
			{:else if data.product.category === 'cosmetic'}
				<p class="text-lime-300">Payment received. Your cosmetic has been added to your account.</p>
			{:else}
				<p class="text-lime-300">Payment received. Your order is complete.</p>
			{/if}
		{:else if status === 'expired'}
			<p class="text-neutral-400">This payment code expired. Start again from Plans &amp; upgrade.</p>
		{:else}
			<p class="text-red-400">This payment did not go through. Start again from Plans &amp; upgrade.</p>
		{/if}
	</Card>

	<div class="flex flex-col gap-2 sm:flex-row">
		<Button href="/upgrade" variant="secondary" class="w-full sm:w-auto">Plans &amp; billing</Button>
		<Button href="/billing/history" variant="ghost" class="w-full sm:w-auto">Payment history</Button>
	</div>
</div>
