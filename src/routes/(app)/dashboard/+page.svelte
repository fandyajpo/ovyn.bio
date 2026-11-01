<script lang="ts">
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { formatDate, formatIdr } from '#lib/utils';

	let { data } = $props();
</script>

<svelte:head>
	<title>Dashboard — OVYN</title>
</svelte:head>

<div class="flex flex-col gap-8">
	<div class="flex items-center justify-between gap-4">
		<h1 class="font-[family-name:var(--font-display)] text-3xl font-bold">
			Hey, {data.profile.displayName || data.profile.slug}
		</h1>
		<Button href="/settings/profile" variant="secondary">Edit profile</Button>
	</div>

	<div class="grid gap-4 sm:grid-cols-3">
		<Card class="p-5">
			<p class="font-mono text-xs uppercase tracking-wider text-neutral-500">Your identity</p>
			<div class="mt-3 flex items-center gap-3">
				<Avatar name={data.profile.displayName || data.profile.slug} src={data.avatarUrl} size="md" />
				<div>
					<a href="/{data.profile.slug}" class="font-medium text-lime-300 hover:underline">
						ovyn.bio/{data.profile.slug}
					</a>
					<p class="font-mono text-xs text-neutral-500">
						{data.profile.visibility === 'public' ? 'Public profile' : 'Private profile'}
					</p>
				</div>
			</div>
		</Card>

		<Card class="p-5">
			<p class="font-mono text-xs uppercase tracking-wider text-neutral-500">Your guild</p>
			{#if data.guild}
				<a href="/guild" class="mt-3 block font-medium text-lime-300 hover:underline">{data.guild.name}</a>
				<p class="font-mono text-xs text-neutral-500">Joined {formatDate(data.membership.joinedAt)}</p>
			{:else}
				<p class="mt-3 text-sm text-neutral-400">You're not in a guild yet.</p>
				<div class="mt-3 flex gap-2">
					<Button href="/discover" variant="secondary">Discover</Button>
					<Button href="/guild/create">Create one</Button>
				</div>
			{/if}
		</Card>

		<Card class="p-5">
			<p class="font-mono text-xs uppercase tracking-wider text-neutral-500">Billing</p>
			{#if data.pendingOrder}
				<a href="/checkout/{data.pendingOrder.id}" class="mt-3 block font-medium text-amber-300 hover:underline">
					Payment pending — {formatIdr(data.pendingOrder.amount)}
				</a>
			{:else}
				<p class="mt-3 text-sm text-neutral-400">No pending payments.</p>
				<Button href="/billing" variant="secondary" class="mt-3">Plans &amp; billing</Button>
			{/if}
		</Card>
	</div>

	{#if data.invitations.length > 0}
		<Card class="p-5">
			<h2 class="font-medium text-neutral-200">Guild invitations</h2>
			<ul class="mt-3 flex flex-col gap-2">
				{#each data.invitations as inv (inv.invitation.id)}
					<li class="flex items-center justify-between gap-3 rounded-lg bg-neutral-800/40 px-4 py-3 text-sm">
						<span>
							Invited to <a href="/guild/{inv.guild.slug}" class="text-lime-300 hover:underline">{inv.guild.name}</a>
							by {inv.inviterName ?? 'a member'}
						</span>
						<a href="/guild/invitations" class="text-lime-300 hover:underline">Review</a>
					</li>
				{/each}
			</ul>
		</Card>
	{/if}
</div>
