<script lang="ts">
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import { formatDate } from '#lib/utils';

	let { data } = $props();

	const p = $derived(data.profile);
	// OVYN display name wins; fall back to the auto-synced Discord identity.
	const displayName = $derived(
		p.displayName || data.discord?.globalName || data.discord?.username || p.slug
	);
</script>

<svelte:head>
	<title>{displayName} (@{p.slug}) — OVYN</title>
</svelte:head>

{#if data.private}
	<div class="mx-auto max-w-md py-24 text-center text-neutral-500">
		This profile is private.
	</div>
{:else}
	<article class="relative mx-auto flex max-w-2xl flex-col gap-6">
		{#if data.cosmetics?.wallpaperUrl}
			<img
				src={data.cosmetics.wallpaperUrl}
				alt=""
				class="absolute inset-0 -z-10 h-64 w-full rounded-xl object-cover opacity-40"
			/>
		{/if}

		{#if data.bannerUrl}
			<img src={data.bannerUrl} alt="" class="h-40 w-full rounded-xl object-cover" />
		{:else if !data.cosmetics?.wallpaperUrl}
			<div class="h-24 w-full rounded-xl bg-gradient-to-r from-neutral-900 to-neutral-800"></div>
		{:else}
			<div class="h-8"></div>
		{/if}

		<div class="flex items-start gap-4">
			<div class="relative">
				<Avatar name={displayName} src={data.avatarUrl} size="xl" />
				{#if data.cosmetics?.frameUrl}
					<img
						src={data.cosmetics.frameUrl}
						alt="Avatar frame"
						class="pointer-events-none absolute -inset-2 size-[calc(100%+16px)] object-contain"
					/>
				{/if}
			</div>
			<div class="min-w-0">
				<h1 class="flex items-center gap-2 truncate font-[family-name:var(--font-display)] text-2xl font-bold">
					{displayName}
					{#if data.cosmetics?.badgeUrl}
						<img src={data.cosmetics.badgeUrl} alt="Badge" class="inline size-6 object-contain" />
					{/if}
				</h1>
				<p class="font-mono text-sm text-neutral-500">@{p.slug}</p>
				{#if data.discord}
					<p class="mt-1 font-mono text-xs text-neutral-600">
						discord: {data.discord.username}
					</p>
				{/if}
			</div>
		</div>

		{#if p.bio}
			<p class="whitespace-pre-line text-neutral-300">{p.bio}</p>
		{/if}

		{#if data.guild}
			<Card class="p-4">
				<p class="font-mono text-xs text-neutral-500 uppercase tracking-wider">Current guild</p>
				<a href="/guild/{data.guild.slug}" class="mt-1 text-lg font-semibold text-lime-300 hover:underline">
					{data.guild.name}
				</a>
			</Card>
		{:else}
			<p class="text-sm text-neutral-500">Not part of a guild yet.</p>
		{/if}

		<p class="font-mono text-xs text-neutral-600">Member since {formatDate(p.createdAt)}</p>
	</article>
{/if}
