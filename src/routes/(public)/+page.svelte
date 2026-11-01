<script lang="ts">
	import type { PageData } from './$types';
	import Button from '#lib/components/ui/Button.svelte';
	import ProfileCard from '#lib/components/ProfileCard.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>OVYN — Your identity. Your circle.</title>
	<meta name="description" content="Create your digital identity, discover communities, and become a member of your guild." />
</svelte:head>

<section class="flex flex-col items-center gap-6 py-20 text-center sm:py-28">
	<p class="font-mono text-sm tracking-widest text-lime-300 uppercase">Digital identity &amp; community</p>
	<h1 class="max-w-3xl font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-6xl">
		Your identity.
		<span class="text-lime-300">Your circle.</span>
	</h1>
	<p class="max-w-xl text-neutral-400">
		Claim your personal page at ovyn.bio, discover guilds, and belong to the community
		that fits you — with full control over your identity.
	</p>
	<div class="flex flex-wrap items-center justify-center gap-3">
		{#if data.user}
			<Button href="/dashboard">Go to dashboard</Button>
			<Button href="/discover" variant="secondary">Discover guilds</Button>
		{:else}
			<Button href="/login">Claim your identity</Button>
			<Button href="/discover" variant="secondary">Discover guilds</Button>
		{/if}
	</div>
</section>

<section class="grid gap-4 py-8 sm:grid-cols-3">
	<div class="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
		<h3 class="font-[family-name:var(--font-display)] text-lg font-semibold">Identity</h3>
		<p class="mt-2 text-sm text-neutral-400">
			A personal page at ovyn.bio/you — Discord-synced identity with your own page wallpaper and style.
		</p>
	</div>
	<div class="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
		<h3 class="font-[family-name:var(--font-display)] text-lg font-semibold">Community</h3>
		<p class="mt-2 text-sm text-neutral-400">
			Join a guild — one circle per person, chosen deliberately. Or create one for yours.
		</p>
	</div>
	<div class="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
		<h3 class="font-[family-name:var(--font-display)] text-lg font-semibold">Make it yours</h3>
		<p class="mt-2 text-sm text-neutral-400">
			Collect profile cosmetics, keep a check-in streak, and put your profile or guild in the spotlight.
		</p>
	</div>
</section>

{#if data.featuredProfiles.length > 0}
	<section class="flex flex-col gap-4 py-10">
		<div class="flex items-end justify-between">
			<div>
				<p class="font-mono text-xs uppercase tracking-wider text-lime-300">Featured</p>
				<h2 class="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold">Identities in the spotlight</h2>
			</div>
			<a href="/spotlight" class="text-sm text-neutral-400 hover:text-lime-300">Get featured</a>
		</div>
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.featuredProfiles as item (item.profile.userId)}
				<ProfileCard
					slug={item.profile.slug}
					displayName={item.profile.displayName}
					bio={item.profile.bio}
					avatarUrl={item.avatarUrl}
					createdAt={item.profile.createdAt}
				/>
			{/each}
		</div>
	</section>
{/if}

{#if data.stats}
	<section class="py-8 text-center font-mono text-sm text-neutral-500">
		{data.stats.guilds} guilds · {data.stats.members} members · {data.stats.profiles} identities
	</section>
{/if}
