<script lang="ts">
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import { formatDate } from '#lib/utils';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.guild.name} — OVYN guild</title>
</svelte:head>

{#if data.disbanded}
	<div class="mx-auto max-w-md py-24 text-center text-neutral-500">This guild has been disbanded.</div>
{:else}
	<article class="mx-auto flex max-w-3xl flex-col gap-6">
		{#if data.bannerUrl}
			<img src={data.bannerUrl} alt="" class="h-44 w-full rounded-xl object-cover" />
		{:else}
			<div class="h-28 w-full rounded-xl bg-gradient-to-r from-neutral-900 to-neutral-800"></div>
		{/if}

		<div class="flex items-center justify-between gap-4">
			<div>
				<h1 class="font-[family-name:var(--font-display)] text-3xl font-bold">{data.guild.name}</h1>
				<p class="mt-1 font-mono text-xs text-neutral-500">
					/{data.guild.slug} · {data.members.length} member{data.members.length === 1 ? '' : 's'} ·
					created {formatDate(data.guild.createdAt)}
				</p>
			</div>
			<span
				class="rounded-full border px-2 py-0.5 text-xs
				{data.guild.visibility === 'public'
					? 'border-lime-300/40 text-lime-300'
					: 'border-neutral-700 text-neutral-400'}"
			>
				{data.guild.visibility}
			</span>
		</div>

		{#if data.guild.description}
			<p class="whitespace-pre-line text-neutral-300">{data.guild.description}</p>
		{/if}

		<Card class="p-4">
			<h2 class="mb-3 font-medium text-neutral-200">Members</h2>
			<ul class="flex flex-col divide-y divide-neutral-800">
				{#each data.members as m (m.slug)}
					<li class="flex items-center gap-3 py-2">
						<Avatar name={m.displayName || m.slug} size="sm" />
						<a href="/{m.slug}" class="text-sm text-neutral-200 hover:text-lime-300">
							{m.displayName || m.slug}
						</a>
						<span class="ml-auto rounded-full border border-neutral-700 px-2 py-0.5 font-mono text-xs text-neutral-400">
							{m.role}
						</span>
					</li>
				{/each}
			</ul>
		</Card>
	</article>
{/if}
