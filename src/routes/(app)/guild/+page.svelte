<script lang="ts">
	import type { PageData } from './$types';
	import Card from '#lib/components/ui/Card.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import { formatDate } from '#lib/utils';

	let { data, form }: { data: PageData; form?: { error?: string } } = $props();

	let confirmingLeave = $state(false);
	let confirmingDisband = $state(false);

	const isOwner = $derived(data.membership?.role === 'owner');
	const canManage = $derived(
		data.membership && (data.membership.role === 'owner' || data.membership.role === 'officer')
	);
</script>

<svelte:head>
	<title>{data.guild ? data.guild.name : 'My guild'} — OVYN</title>
</svelte:head>

<div class="mx-auto flex max-w-3xl flex-col gap-6">
	<h1 class="font-[family-name:var(--font-display)] text-3xl font-bold">My guild</h1>

	{#if form?.error}
		<p class="rounded-lg border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300" role="alert">
			{form.error}
		</p>
	{/if}

	{#if !data.guild}
		<Card class="flex flex-col items-center gap-4 p-10 text-center">
			<p class="text-neutral-400">You're not in a guild yet. OVYN is better with your circle.</p>
			<div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
				<Button href="/discover" variant="secondary" class="w-full sm:w-auto">Discover guilds</Button>
				<Button href="/guild/create" class="w-full sm:w-auto">Create a guild</Button>
			</div>
		</Card>
	{:else}
		<Card class="p-6">
			<div class="flex items-start justify-between gap-4">
				<div>
					<h2 class="text-2xl font-semibold">{data.guild.name}</h2>
					<p class="font-mono text-xs text-neutral-500">
						/{data.guild.slug} · {data.members.length} member{data.members.length === 1 ? '' : 's'} ·
						your role: <span class="text-lime-300">{data.membership.role}</span>
					</p>
				</div>
				{#if canManage}
					<Button href="/guild/{data.guild.slug}/manage" variant="secondary">Manage</Button>
				{/if}
			</div>

			{#if data.guild.description}
				<p class="mt-3 text-sm text-neutral-300">{data.guild.description}</p>
			{/if}
		</Card>

		<Card class="p-4">
			<h2 class="mb-3 font-medium text-neutral-200">Members</h2>
			<ul class="flex flex-col divide-y divide-neutral-800">
				{#each data.members as m (m.slug)}
					<li class="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
						<Avatar name={m.displayName || m.slug} size="sm" />
						<a href="/{m.slug}" class="min-w-0 max-w-full truncate text-sm text-neutral-200 hover:text-lime-300">{m.displayName || m.slug}</a>
						<span class="font-mono text-xs text-neutral-600">joined {formatDate(m.joinedAt)}</span>
						<span class="ml-auto rounded-full border border-neutral-700 px-2 py-0.5 font-mono text-xs text-neutral-400">
							{m.role}
						</span>
					</li>
				{/each}
			</ul>
		</Card>

		<section class="flex flex-wrap items-center gap-4 rounded-xl border border-neutral-800 p-5">
			{#if isOwner}
				{#if data.members.length === 1}
					{#if confirmingDisband}
						<p class="text-sm text-red-300">Disband "{data.guild.name}"? This cannot be undone.</p>
						<form method="POST" action="/guild">
							<input type="hidden" name="intent" value="disband" />
							<Button type="submit" variant="danger">Yes, disband</Button>
						</form>
						<Button variant="ghost" onclick={() => (confirmingDisband = false)}>Keep guild</Button>
					{:else}
						<Button variant="danger" onclick={() => (confirmingDisband = true)}>Disband guild</Button>
					{/if}
				{:else}
					<p class="text-sm text-neutral-400">Transfer ownership in guild settings before leaving.</p>
				{/if}
			{:else if confirmingLeave}
				<form method="POST" action="/guild">
					<input type="hidden" name="intent" value="leave" />
					<Button type="submit" variant="danger">Confirm: leave "{data.guild.name}"</Button>
				</form>
				<Button variant="ghost" onclick={() => (confirmingLeave = false)}>Cancel</Button>
			{:else}
				<Button variant="danger" onclick={() => (confirmingLeave = true)}>Leave guild</Button>
				<p class="text-xs text-neutral-500">You can join or create another guild after leaving.</p>
			{/if}
		</section>
	{/if}
</div>
