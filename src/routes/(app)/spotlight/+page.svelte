<script lang="ts">
	import type { PageData } from './$types';
	import Card from '#lib/components/ui/Card.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { formatIdr } from '#lib/utils';

	let { data, form }: { data: PageData; form?: { error?: string } } = $props();
</script>

<svelte:head>
	<title>Spotlight — OVYN</title>
</svelte:head>

<div class="mx-auto flex max-w-4xl flex-col gap-8">
	<div>
		<h1 class="font-[family-name:var(--font-display)] text-3xl font-bold">Get discovered</h1>
		<p class="mt-1 text-neutral-400">Feature your profile or guild in discovery. The spotlight starts after payment is confirmed.</p>
	</div>

	{#if form?.error}
		<p class="rounded-lg border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300" role="alert">
			{form.error}
		</p>
	{/if}

	<section class="flex flex-col gap-4">
		<h2 class="font-[family-name:var(--font-display)] text-xl font-semibold">Feature your profile</h2>
		{#if data.profileProducts.length === 0}
			<Card class="p-5 text-sm text-neutral-500">Profile spotlights are not available yet.</Card>
		{:else}
			<div class="grid gap-4 sm:grid-cols-2">
				{#each data.profileProducts as product (product.id)}
					<Card class="flex items-center justify-between gap-4 p-5">
						<div>
							<p class="font-medium text-neutral-100">{product.name}</p>
						<p class="text-sm text-neutral-400">{product.description}</p>
						<p class="mt-1 font-mono text-xs text-neutral-500">{product.durationDays} days · {formatIdr(product.price)}</p>
						</div>
						<form method="POST" action="/spotlight">
							<input type="hidden" name="productId" value={product.id} />
							<input type="hidden" name="targetType" value="profile" />
							<input type="hidden" name="targetId" value={data.userId} />
							<Button type="submit">Feature</Button>
						</form>
					</Card>
				{/each}
			</div>
		{/if}
	</section>

	<section class="flex flex-col gap-4">
		<h2 class="font-[family-name:var(--font-display)] text-xl font-semibold">Feature your guild</h2>
		{#if !data.guild}
			<Card class="p-5 text-sm text-neutral-500">You need to own an active guild to feature it.</Card>
		{:else if data.guildProducts.length === 0}
			<Card class="p-5 text-sm text-neutral-500">Guild spotlights are not available yet.</Card>
		{:else}
			<p class="text-sm text-neutral-400">Featuring: <span class="text-neutral-100">{data.guild.name}</span></p>
			<div class="grid gap-4 sm:grid-cols-2">
				{#each data.guildProducts as product (product.id)}
					<Card class="flex items-center justify-between gap-4 p-5">
						<div>
							<p class="font-medium text-neutral-100">{product.name}</p>
						<p class="text-sm text-neutral-400">{product.description}</p>
						<p class="mt-1 font-mono text-xs text-neutral-500">{product.durationDays} days · {formatIdr(product.price)}</p>
						</div>
						<form method="POST" action="/spotlight">
							<input type="hidden" name="productId" value={product.id} />
							<input type="hidden" name="targetType" value="guild" />
							<input type="hidden" name="targetId" value={data.guild.id} />
							<Button type="submit">Feature</Button>
						</form>
					</Card>
				{/each}
			</div>
		{/if}
	</section>
</div>
