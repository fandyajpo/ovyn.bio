<script lang="ts">
	import type { PageData } from './$types';
	import Input from '#lib/components/ui/Input.svelte';

	let { data, form }: { data: PageData; form?: { error?: string; ok?: boolean } } = $props();
</script>

<svelte:head>
	<title>Discover guilds — OVYN</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div>
		<h1 class="font-[family-name:var(--font-display)] text-3xl font-bold">Discover guilds</h1>
		<p class="mt-1 text-neutral-400">
			{#if data.membership}
				You are a member of <a href="/guild/{data.membership.guild.slug}" class="text-lime-300">{data.membership.guild.name}</a>.
				Leave your current guild before joining another one.
			{:else}
				Public guilds you can join right now. Private guilds need an invitation.
			{/if}
		</p>
	</div>

	<form method="GET" class="max-w-md">
		<Input name="q" label="Search" placeholder="Search by guild name" value={data.q ?? ''} />
	</form>

	{#if form?.error}
		<p class="rounded-lg border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300" role="alert">
			{form.error}
		</p>
	{/if}

	{#if form?.ok}
		<p class="rounded-lg border border-lime-300/40 bg-lime-300/10 px-4 py-3 text-sm text-lime-200" role="status">
			Joined the guild. Welcome!
		</p>
	{/if}

	{#if data.guilds.length === 0}
		<div class="rounded-xl border border-dashed border-neutral-800 p-12 text-center text-neutral-500">
			{data.q ? 'No guilds match your search.' : 'No public guilds yet. Be the first to create one!'}
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.guilds as row (row.guild.id)}
				<div class="flex h-full flex-col justify-between gap-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
					<div>
						<div class="flex items-center justify-between gap-2">
							<a href="/guild/{row.guild.slug}" class="text-lg font-semibold text-neutral-100 hover:text-lime-300">
								{row.guild.name}
							</a>
							<span
								class="rounded-full border px-2 py-0.5 text-xs
								{row.guild.visibility === 'public'
									? 'border-lime-300/40 text-lime-300'
									: 'border-neutral-700 text-neutral-400'}"
							>
								{row.guild.visibility}
							</span>
						</div>
						{#if row.guild.description}
							<p class="mt-1 line-clamp-2 text-sm text-neutral-400">{row.guild.description}</p>
						{/if}
						<p class="mt-2 font-mono text-xs text-neutral-500">
							{Number(row.memberCount)} member{Number(row.memberCount) === 1 ? '' : 's'}
						</p>
					</div>

					{#if data.membership?.guild.id === row.guild.id}
						<span class="text-sm font-medium text-lime-300">Your guild</span>
					{:else if row.guild.visibility === 'private'}
						<span class="text-sm text-neutral-500">Invite only</span>
					{:else if data.membership}
						<span class="text-sm text-neutral-500">Leave your current guild first to join this one</span>
					{:else}
						<form method="POST" action="/discover">
							<input type="hidden" name="slug" value={row.guild.slug} />
							<button
								type="submit"
								class="w-full rounded-lg bg-lime-300 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-lime-200"
							>
								Join guild
							</button>
						</form>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
