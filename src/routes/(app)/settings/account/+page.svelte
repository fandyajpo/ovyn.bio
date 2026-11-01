<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import { signOut } from '#lib/auth-client';

	let { data } = $props();

	let confirmDelete = $state(false);

	async function logout() {
		await signOut();
		location.href = '/';
	}
</script>

<svelte:head>
	<title>Account settings — OVYN</title>
</svelte:head>

<div class="mx-auto flex max-w-2xl flex-col gap-6">
	<h1 class="font-[family-name:var(--font-display)] text-3xl font-bold">Account</h1>

	<section class="rounded-xl border border-neutral-800 p-5">
		<h2 class="font-medium text-neutral-200">Discord account</h2>
		<p class="mt-1 text-sm text-neutral-400">
			You signed in with <span class="font-mono text-neutral-200">{data.discord?.username}</span>.
			OVYN has one identity per Discord account and no passwords.
		</p>
		<Button variant="secondary" onclick={logout} class="mt-4">Sign out</Button>
	</section>

	<section class="rounded-xl border border-red-900/60 p-5">
		<h2 class="font-medium text-red-300">Danger zone</h2>
		<p class="mt-1 text-sm text-neutral-400">
			{#if confirmDelete}
				Are you sure? This permanently deletes your profile and membership. This cannot be undone.
			{:else}
				Deleting your account removes your profile, uploads and guild membership.
			{/if}
		</p>
		<Button variant="danger" onclick={() => (confirmDelete ? confirmDelete = false : confirmDelete = true)} class="mt-4">
			{confirmDelete ? 'Hold on — really delete?' : 'Delete account'}
		</Button>
		{#if confirmDelete}
			<p class="mt-2 text-xs text-neutral-500">
				Account deletion is final once confirmed in Discord-linked billing flows. Contact support to proceed.
			</p>
		{/if}
	</section>
</div>
