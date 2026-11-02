<script lang="ts">
	import type { PageData } from './$types';
	import Card from '#lib/components/ui/Card.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { formatDate } from '#lib/utils';

	let { data, form }: { data: PageData; form?: { error?: string } } = $props();
</script>

<svelte:head>
	<title>Guild invitations - ovyn</title>
</svelte:head>

<div class="mx-auto flex max-w-2xl flex-col gap-6">
	<h1 class="font-[family-name:var(--font-display)] text-3xl font-bold">Invitations</h1>

	{#if form?.error}
		<p class="text-sm text-red-400" role="alert">{form.error}</p>
	{/if}

	{#if data.invitations.length === 0}
		<Card class="p-10 text-center text-neutral-500">No pending invitations.</Card>
	{:else}
		{#each data.invitations as inv (inv.invitation.id)}
			<Card class="flex items-center justify-between gap-4 p-4">
				<div>
					<p class="font-medium text-neutral-100">
						<a href="/guild/{inv.guild.slug}" class="hover:text-lime-300">{inv.guild.name}</a>
					</p>
					<p class="text-xs text-neutral-500">
						from {inv.inviterName ?? 'a member'} · expires {formatDate(inv.invitation.expiresAt)}
					</p>
				</div>
				{#if data.membership}
					<span class="text-xs text-neutral-500">Leave your current guild first</span>
				{:else}
					<div class="flex gap-2">
						<form method="POST" action="/guild/invitations">
							<input type="hidden" name="invitationId" value={inv.invitation.id} />
							<input type="hidden" name="intent" value="accept" />
							<Button type="submit">Accept</Button>
						</form>
						<form method="POST" action="/guild/invitations">
							<input type="hidden" name="invitationId" value={inv.invitation.id} />
							<input type="hidden" name="intent" value="reject" />
							<Button type="submit" variant="ghost">Reject</Button>
						</form>
					</div>
				{/if}
			</Card>
		{/each}
	{/if}
</div>
