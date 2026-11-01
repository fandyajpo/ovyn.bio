<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import UploadButton from '$lib/components/UploadButton.svelte';
	import { formatDate } from '$lib/utils';

	let { data, form }: { data: PageData; form?: { error?: string; ok?: string } } = $props();

	let name = $state(data.guild.name);
	let description = $state(data.guild.description ?? '');
	let visibility = $state<string>(data.guild.visibility);

	let inviteQuery = $state('');
	let candidates = $state<Array<{ userId: string; slug: string; displayName: string | null }>>([]);
	let searching = $state(false);
	let selectedUser = $state<{ userId: string; slug: string } | null>(null);

	let searchTimer: ReturnType<typeof setTimeout>;

	function onSearch() {
		clearTimeout(searchTimer);
		if (inviteQuery.length < 2) {
			candidates = [];
			return;
		}
		searching = true;
		searchTimer = setTimeout(async () => {
			const res = await fetch(
				`/guild/${data.guild.slug}/manage/candidates?q=${encodeURIComponent(inviteQuery)}`
			);
			candidates = await res.json();
			searching = false;
		}, 300);
	}
</script>

<svelte:head>
	<title>Manage {data.guild.name} — OVYN</title>
</svelte:head>

<div class="mx-auto flex max-w-2xl flex-col gap-6">
	<h1 class="font-[family-name:var(--font-display)] text-3xl font-bold">Manage guild</h1>

	{#if form?.error}
		<p class="text-sm text-red-400" role="alert">{form.error}</p>
	{/if}
	{#if form?.ok}
		<p class="text-sm text-lime-300" role="status">{form.ok}</p>
	{/if}

	<!-- Only owners edit guild settings -->
	{#if data.role === 'owner'}
		<form method="POST" action="/guild/{data.guild.slug}/manage" class="rounded-xl border border-neutral-800 p-5">
			<input type="hidden" name="intent" value="settings" />
			<h2 class="mb-4 font-medium text-neutral-200">Guild settings</h2>
			<div class="flex flex-col gap-4">
				<Input name="name" label="Guild name" bind:value={name} required minlength={2} maxlength={50} />
				<Input name="description" label="Description" bind:value={description} textarea maxlength={500} />
				<fieldset class="flex items-center gap-3">
					<legend class="mb-1.5 text-sm font-medium text-neutral-300">Visibility</legend>
					<label class="flex items-center gap-2 text-sm text-neutral-300">
						<input type="radio" name="visibility" value="public" bind:group={visibility} /> Public
					</label>
					<label class="flex items-center gap-2 text-sm text-neutral-300">
						<input type="radio" name="visibility" value="private" bind:group={visibility} /> Private
					</label>
				</fieldset>
				<div class="flex flex-wrap items-center gap-3">
					<Button type="submit">Save settings</Button>
					<UploadButton kind="icon" existingKey={data.guild.iconKey} label="Upload icon" />
					<UploadButton kind="banner" existingKey={data.guild.bannerKey} label="Upload banner" />
				</div>
			</div>
		</form>
	{:else}
		<p class="text-sm text-neutral-400">Officers can manage invitations and members; only owners can edit settings.</p>
	{/if}

	<!-- Invitations -->
	<Card class="p-5">
		<h2 class="mb-3 font-medium text-neutral-200">Invite a member</h2>
		<input
			bind:value={inviteQuery}
			oninput={onSearch}
			placeholder="Search by username…"
			class="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-lime-300"
		/>
		{#if searching}<p class="mt-2 text-xs text-neutral-500">Searching…</p>{/if}

		{#if candidates.length > 0}
			<ul class="mt-3 flex flex-col gap-1">
				{#each candidates as c (c.userId)}
					<li class="flex items-center justify-between rounded-lg bg-neutral-800/40 px-3 py-2">
						<span class="text-sm text-neutral-200">
							{c.displayName || c.slug} <span class="font-mono text-xs text-neutral-500">@{c.slug}</span>
						</span>
						<form method="POST" action="/guild/{data.guild.slug}/manage">
							<input type="hidden" name="intent" value="invite" />
							<input type="hidden" name="userId" value={c.userId} />
							<Button type="submit" variant="secondary">Invite</Button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}

		{#if data.invitations.length > 0}
			<h3 class="mt-5 text-sm font-medium text-neutral-300">Pending invitations</h3>
			<ul class="mt-2 flex flex-col divide-y divide-neutral-800">
				{#each data.invitations as inv (inv.invitation.id)}
					<li class="flex items-center justify-between py-2 text-sm">
						<span>
							@{inv.inviteeSlug}
							<span class="font-mono text-xs text-neutral-600">expires {formatDate(inv.invitation.expiresAt)}</span>
						</span>
						<form method="POST" action="/guild/{data.guild.slug}/manage">
							<input type="hidden" name="intent" value="cancel-invite" />
							<input type="hidden" name="invitationId" value={inv.invitation.id} />
							<Button type="submit" variant="ghost">Cancel</Button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</Card>

	<!-- Member management -->
	<Card class="p-5">
		<h2 class="mb-3 font-medium text-neutral-200">Members</h2>
		<ul class="flex flex-col divide-y divide-neutral-800">
			{#each data.members as m (m.slug)}
				<li class="flex flex-wrap items-center gap-3 py-2">
					<span class="text-sm text-neutral-200">
						<a href="/{m.slug}" class="hover:text-lime-300">{m.displayName || m.slug}</a>
						<span class="rounded-full border border-neutral-700 px-2 py-0.5 font-mono text-xs text-neutral-400">
							{m.role}
						</span>
					</span>

					{#if data.role === 'owner' && m.role !== 'owner'}
						<div class="ml-auto flex gap-2">
							<form method="POST" action="/guild/{data.guild.slug}/manage">
								<input type="hidden" name="intent" value="promote" />
								<input type="hidden" name="userId" value={m.userId} />
								<input type="hidden" name="role" value={m.role === 'officer' ? 'member' : 'officer'} />
								<Button type="submit" variant="ghost">
									{m.role === 'officer' ? 'Demote' : 'Promote'}
								</Button>
							</form>
							<form method="POST" action="/guild/{data.guild.slug}/manage">
								<input type="hidden" name="intent" value="transfer" />
								<input type="hidden" name="userId" value={m.userId} />
								<Button type="submit" variant="secondary">Make owner</Button>
							</form>
							<form method="POST" action="/guild/{data.guild.slug}/manage">
								<input type="hidden" name="intent" value="remove" />
								<input type="hidden" name="userId" value={m.userId} />
								<Button type="submit" variant="danger">Remove</Button>
							</form>
						</div>
					{:else if data.role === 'officer' && m.role === 'member'}
						<form class="ml-auto" method="POST" action="/guild/{data.guild.slug}/manage">
							<input type="hidden" name="intent" value="remove" />
							<input type="hidden" name="userId" value={m.userId} />
							<Button type="submit" variant="danger">Remove</Button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
	</Card>
</div>
