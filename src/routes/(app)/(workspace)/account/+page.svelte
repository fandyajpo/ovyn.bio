<script lang="ts">
	import { browser } from '$app/env';
	import type { PageData } from './$types';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import ShareProfileSheet from '#lib/components/ShareProfileSheet.svelte';
	import { formatDate } from '#lib/utils';

	let { data }: { data: PageData } = $props();
	let shareOpen = $state(false);

	const profileUrl = $derived(
		browser
			? new URL(`/${data.profile.slug}`, window.location.origin).toString()
			: `https://ovyn.me/${data.profile.slug}`
	);
</script>

<svelte:head>
	<title>Account overview - ovyn</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<span class="sticker sticker--blue">ACCOUNT OVERVIEW</span>
			<h1 class="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">Your space</h1>
			<p class="mt-1 text-neutral-400">Your page, your circle, all in one place.</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<Button href="/settings/profile" variant="ghost">Edit profile details</Button>
			<Button href="/customize" variant="secondary">Customize page</Button>
			<Button href="/{data.profile.slug}" variant="ghost">View my page</Button>
			{#if data.isAdmin}<Button href="/admin" variant="ghost">Admin dashboard</Button>{/if}
		</div>
	</div>

	<div class="grid gap-4 xl:grid-cols-2">
		<Card class="flex flex-col gap-4 p-5">
			<div class="flex items-center gap-4">
				<Avatar name={data.profile.displayName || data.profile.slug} src={data.avatarUrl} size="lg" />
				<div class="min-w-0 flex-1">
					<p class="truncate font-[family-name:var(--font-display)] text-xl font-semibold">{data.profile.displayName || data.profile.slug}</p>
					<p class="font-mono text-sm text-lime-300">ovyn.me/{data.profile.slug}</p>
					<p class="text-xs text-neutral-500">{data.profile.visibility === 'public' ? 'Public page' : 'Private page'} · member since {formatDate(data.profile.createdAt)}</p>
				</div>
			</div>
			<p class="text-sm text-neutral-400">{data.profile.bio || 'Add a short bio to make your page feel like you.'}</p>
			<div class="flex flex-wrap gap-2">
				<Button href="/customize" variant="secondary">Edit my page</Button>
				<Button href="/links" variant="ghost">Manage links</Button>
				<Button onclick={() => (shareOpen = true)} variant="ghost">Share my page</Button>
			</div>
		</Card>

		<Card class="flex flex-col gap-3 p-5">
			<div class="flex items-center justify-between gap-3">
				<p class="font-mono text-xs uppercase tracking-wider text-neutral-500">Current plan</p>
				<span class="sticker {data.plan.tier === 'premium' ? 'sticker--lilac' : 'sticker--blue'}">{data.plan.tier}</span>
			</div>
			<p class="font-[family-name:var(--font-display)] text-2xl font-bold">{data.plan.tier === 'premium' ? 'Premium' : 'Free'}</p>
			{#if data.plan.tier === 'premium'}
				<p class="text-sm text-neutral-400">{data.plan.isLifetime ? 'Lifetime Premium access.' : `Premium active until ${data.plan.premiumUntil ? formatDate(data.plan.premiumUntil) : 'date unavailable'} · ${data.plan.daysRemaining} days left.`}</p>
			{:else}
				<p class="text-sm text-neutral-400">Free includes your profile, analytics and social links. Premium is Rp 30.000 a month.</p>
			{/if}
			<Button href="/upgrade" variant="secondary" class="mt-auto w-fit">Plans &amp; upgrade</Button>
		</Card>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card class="p-5">
			<p class="font-mono text-xs uppercase tracking-wider text-neutral-500">Your circle</p>
			{#if data.circle}
				<p class="mt-2 truncate font-[family-name:var(--font-display)] text-2xl font-bold">{data.circle.guild.name}</p>
				<p class="text-sm text-neutral-500">Your role: {data.circle.membership.role}</p>
				<a href="/guild" class="mt-3 inline-block text-sm text-lime-300 hover:underline">Open your circle</a>
			{:else}
				<p class="mt-2 text-sm text-neutral-300">You are not in a circle yet.</p>
				<a href="/discover" class="mt-3 inline-block text-sm text-lime-300 hover:underline">Find your circle</a>
			{/if}
		</Card>
		<Card class="p-5">
			<p class="font-mono text-xs uppercase tracking-wider text-neutral-500">Profile views · 30 days</p>
			<p class="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold">{data.analytics.views}</p>
			<p class="text-sm text-neutral-500">{data.analytics.uniqueVisitors} unique visitors</p>
			<a href="/account/analytics" class="mt-3 inline-block text-sm text-lime-300 hover:underline">Open analytics</a>
		</Card>
		<Card class="p-5">
			<p class="font-mono text-xs uppercase tracking-wider text-neutral-500">Profile badges</p>
			<p class="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold">{data.owned.badges.length}</p>
			<a href="/account/badges" class="mt-3 inline-block text-sm text-lime-300 hover:underline">View badges</a>
		</Card>
		<Card class="p-5">
			<p class="font-mono text-xs uppercase tracking-wider text-neutral-500">Templates</p>
			<p class="mt-2 text-sm text-neutral-300">Save your look or try a community style.</p>
			<a href="/templates" class="mt-3 inline-block text-sm text-lime-300 hover:underline">Browse templates</a>
		</Card>
	</div>

	<ShareProfileSheet
		bind:open={shareOpen}
		url={profileUrl}
		name={data.profile.displayName || data.profile.slug}
		handle={data.profile.slug}
		bio={data.profile.bio}
	/>
</div>
