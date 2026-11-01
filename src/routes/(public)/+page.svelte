<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';

	let { user, stats } = $props();
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
		{#if user}
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
			Your profile at ovyn.bio/you — display name, avatar, banner, and bio. Fully yours.
		</p>
	</div>
	<div class="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
		<h3 class="font-[family-name:var(--font-display)] text-lg font-semibold">Community</h3>
		<p class="mt-2 text-sm text-neutral-400">
			Join a guild — one circle per person, chosen deliberately. Or create one for yours.
		</p>
	</div>
	<div class="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
		<h3 class="font-[family-name:var(--font-display)] text-lg font-semibold">Ownership</h3>
		<p class="mt-2 text-sm text-neutral-400">
			Your identity and membership belong to you. Change, move, or leave whenever you decide.
		</p>
	</div>
</section>

{#if stats}
	<section class="py-8 text-center font-mono text-sm text-neutral-500">
		{stats.guilds} guilds · {stats.members} members · {stats.profiles} identities
	</section>
{/if}
