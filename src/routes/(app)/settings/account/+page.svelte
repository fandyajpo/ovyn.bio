<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import PushNotificationSettings from '#lib/components/PushNotificationSettings.svelte';
	import { signOut } from '#lib/auth-client';

	let { data } = $props();

	let confirmDelete = $state(false);

	async function logout() {
		await signOut();
		location.href = '/';
	}
</script>

<svelte:head>
	<title>Account settings - ovyn</title>
</svelte:head>

<div class="mx-auto flex max-w-2xl flex-col gap-6">
	<h1 class="font-[family-name:var(--font-display)] text-3xl font-bold">Account</h1>

	<section class="rounded-xl border border-neutral-800 p-5">
		<h2 class="font-medium text-neutral-200">{data.discord ? 'Discord identity' : 'Google identity'}</h2>
		<div class="mt-4 flex items-center gap-4">
			<Avatar name={data.discord?.globalName ?? data.discord?.username ?? data.userName} src={data.avatarUrl} size="lg" />
			<div class="min-w-0">
				<p class="truncate font-medium text-neutral-100">{data.discord?.globalName ?? data.discord?.username ?? data.userName}</p>
				<p class="mt-1 font-mono text-xs text-neutral-400">{data.discord ? `@${data.discord.username}` : 'Signed in with Google'}</p>
				{#if data.discord?.discordId}<p class="mt-1 font-mono text-[10px] text-neutral-600">Discord ID · {data.discord.discordId}</p>{/if}
			</div>
		</div>
		<p class="mt-3 text-sm text-neutral-500">Your email or username and password, Discord or Google protect your sign-in. Your ovyn username, display name, bio and profile picture stay yours to customize.</p>
		<Button variant="secondary" onclick={logout} class="mt-4">Sign out</Button>
	</section>

	<PushNotificationSettings />

	<section class="rounded-xl border border-red-900/60 p-5">
		<h2 class="font-medium text-red-300">Danger zone</h2>
		<p class="mt-1 text-sm text-neutral-400">
			{#if confirmDelete}
				Are you sure? This permanently deletes your profile and membership. This cannot be undone.
			{:else}
				Deleting your account removes your profile, uploads and circle membership.
			{/if}
		</p>
		<Button variant="danger" onclick={() => (confirmDelete ? confirmDelete = false : confirmDelete = true)} class="mt-4">
			{confirmDelete ? 'Hold on - really delete?' : 'Delete account'}
		</Button>
		{#if confirmDelete}
			<p class="mt-2 text-xs text-neutral-500">
				Account deletion is final once confirmed in Discord-linked billing flows. Contact support to proceed.
			</p>
		{/if}
	</section>
</div>
