<script lang="ts">
	import type { PageData } from './$types';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Card from '#lib/components/ui/Card.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Profile analytics — OVYN</title>
</svelte:head>

<div class="mx-auto flex max-w-2xl flex-col gap-6">
	<div>
		<h1 class="font-[family-name:var(--font-display)] text-3xl font-bold">Profile analytics</h1>
		<p class="mt-1 text-neutral-400">Signed-in visitors to your public profile over the last 30 days.</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<Card class="p-5">
			<p class="font-mono text-xs uppercase tracking-wider text-neutral-500">Signed-in visits</p>
			<p class="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold">{data.analytics.views}</p>
		</Card>
		<Card class="p-5">
			<p class="font-mono text-xs uppercase tracking-wider text-neutral-500">Unique visitors</p>
			<p class="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold">{data.analytics.uniqueVisitors}</p>
		</Card>
	</div>

	<Card class="p-5">
		<h2 class="mb-3 font-medium text-neutral-200">Daily visits</h2>
		{#if data.analytics.daily.length === 0}
			<p class="text-sm text-neutral-500">No visits yet. Share your profile to get started.</p>
		{:else}
			<ul class="flex flex-col divide-y divide-neutral-800">
				{#each data.analytics.daily as day (day.date)}
					<li class="flex justify-between py-2 text-sm">
						<time datetime={day.date} class="font-mono text-neutral-400">{day.date}</time>
						<span class="text-neutral-200">{day.views} view{day.views === 1 ? '' : 's'}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</Card>

	<Card class="p-5">
		<h2 class="mb-1 font-medium text-neutral-200">Recent visitors</h2>
		<p class="mb-4 text-xs text-neutral-500">Public-profile visitors from the last 30 days. Private visitor profiles are not identified here.</p>
		{#if data.analytics.recentVisitors.length === 0}
			<p class="text-sm text-neutral-500">No identifiable visitors yet.</p>
		{:else}
			<ul class="flex flex-col divide-y divide-neutral-800">
				{#each data.analytics.recentVisitors as visitor (visitor.slug)}
					<li class="flex items-center justify-between gap-3 py-3">
						<a href="/{visitor.slug}" class="flex min-w-0 items-center gap-3 hover:text-lime-300">
							<Avatar name={visitor.displayName || visitor.globalName || visitor.discordUsername || visitor.slug} src={visitor.avatarUrl} size="sm" />
							<span class="min-w-0">
								<span class="block truncate text-sm text-neutral-200">{visitor.displayName || visitor.globalName || visitor.discordUsername || visitor.slug}</span>
								<span class="font-mono text-xs text-neutral-500">@{visitor.slug}</span>
							</span>
						</a>
						<time datetime={visitor.viewedOn} class="shrink-0 font-mono text-xs text-neutral-500">{visitor.viewedOn}</time>
					</li>
				{/each}
			</ul>
		{/if}
	</Card>

	<p class="text-xs text-neutral-600">
		Only signed-in visits are counted, once per visitor per UTC day. Signed-in visitors with public profiles may appear above. OVYN does not store IP addresses or user agents for this feature.
	</p>
</div>
