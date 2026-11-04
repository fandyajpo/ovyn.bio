<script lang="ts">
	import type { PageData } from './$types';
	import Card from '#lib/components/ui/Card.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { formatDate, formatIdr } from '#lib/utils';

	let { data, form }: { data: PageData; form?: { error?: string } } = $props();
	let selected = $state<string | null>(null);
	const freeFeatures = ['Background effects', 'Profile analytics', 'Username effects', 'Color customization', 'Social links'];
	const premiumFeatures = [
		'Everything in Free',
		'Profile layout and layout customization',
		'Exclusive badge and profile preferences',
		'Text font and typewriter description',
		'Cursor effects and profile widgets',
		'Metadata, SEO and page aliases'
	];
</script>

<svelte:head>
	<title>Plans - ovyn</title>
</svelte:head>

<div class="mx-auto flex max-w-5xl flex-col gap-8 py-3">
	<div class="max-w-2xl">
		<p class="landing-eyebrow">Plans that stay simple</p>
		<h1 class="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Your space, your choice.</h1>
		<p class="mt-3 text-sm leading-7 text-neutral-400">Start free. Premium is Rp 30.000 a month: 30 days per payment, renewed by hand, with no automatic charge.</p>
	</div>

	{#if form?.error}<p class="text-sm text-red-400" role="alert">{form.error}</p>{/if}

	<Card class="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<p class="text-xs font-medium tracking-[0.16em] text-neutral-500">Your current plan</p>
			<p class="mt-1 text-xl font-semibold">{data.plan.tier === 'premium' ? 'ovyn Premium' : 'ovyn Free'}</p>
		</div>
		{#if data.plan.tier === 'premium'}
			<p class="text-sm text-neutral-400">
				{data.plan.isLifetime
					? 'Lifetime access'
					: `Active until ${data.plan.premiumUntil ? formatDate(data.plan.premiumUntil) : 'date unavailable'} · ${data.plan.daysRemaining} days left`}
			</p>
		{:else}
			<p class="text-sm text-neutral-400">You can upgrade whenever you are ready.</p>
		{/if}
	</Card>

	<div class="grid gap-5 md:grid-cols-2">
		<Card class="plan-card flex flex-col gap-5 p-6 sm:p-8">
			<div><p class="landing-eyebrow">The essentials</p><h2 class="mt-2 text-2xl font-semibold">Free</h2></div>
			<p class="text-3xl font-semibold">Rp 0 <span class="text-sm font-normal text-neutral-500">forever</span></p>
			<ul class="plan-feature-list">
				{#each freeFeatures as feature (feature)}<li><span aria-hidden="true">✓</span>{feature}</li>{/each}
			</ul>
			{#if data.plan.tier === 'free'}<span class="plan-current">Your current plan</span>{/if}
		</Card>

		<Card class="plan-card plan-card--premium flex flex-col gap-5 p-6 sm:p-8">
			<div class="flex items-start justify-between gap-4">
				<div><p class="landing-eyebrow">The full toolkit</p><h2 class="mt-2 text-2xl font-semibold">Premium</h2></div>
				<span class="premium-mark">30 DAYS</span>
			</div>
			<p class="text-3xl font-semibold">Rp 30.000 <span class="text-sm font-normal text-neutral-500">per month</span></p>
			<ul class="plan-feature-list">
				{#each premiumFeatures as feature (feature)}<li><span aria-hidden="true">✓</span>{feature}</li>{/each}
			</ul>
			<p class="plan-rollout-note">Layouts, the Premium badge and cursor effects are live now. Fonts, widgets, SEO, typewriter text, aliases and extra preferences are in development.</p>
			{#if data.products.length === 0}
				<p class="mt-auto text-sm text-neutral-500">Premium checkout is being prepared. Check back soon.</p>
			{:else}
				<div class="mt-auto flex flex-col gap-3">
					{#each data.products as product (product.id)}
						<button type="button" onclick={() => (selected = product.id)} aria-pressed={selected === product.id} class="plan-choice {selected === product.id ? 'plan-choice--selected' : ''}">
							<span>{product.name}</span><strong>{formatIdr(product.price)} / 30 days</strong>
						</button>
					{/each}
					<form method="POST" action="/upgrade" class="flex flex-col gap-3">
						<input type="hidden" name="productId" value={selected ?? ''} />
						<Button type="submit" disabled={!selected} class="w-full">{data.plan.tier === 'premium' ? 'Renew Premium' : 'Get Premium'}</Button>
						<p class="text-center text-xs text-neutral-500">30 days per payment · manual renewal · no auto-charge</p>
					</form>
				</div>
			{/if}
		</Card>
	</div>
</div>
