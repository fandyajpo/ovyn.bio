<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import PushNotificationSettings from '#lib/components/PushNotificationSettings.svelte';
	import { signOut } from '#lib/auth-client';

	let { data } = $props();

	async function logout() {
		await signOut();
		location.href = '/';
	}
</script>

<svelte:head>
	<title>Account settings - OVYN</title>
</svelte:head>

<div class="mx-auto flex max-w-2xl flex-col gap-6">
	<h1 class="font-[family-name:var(--font-display)] text-3xl font-bold">Account</h1>

	<section class="rounded-xl border border-neutral-800 p-5">
		<h2 class="font-medium text-neutral-200">{data.discord ? 'Discord identity' : 'Google identity'}</h2>
		<div class="mt-4 flex items-center gap-4">
			<Avatar name={data.discord?.globalName ?? data.discord?.username ?? data.userName} src={data.discord?.avatarUrl ?? data.userImage} size="lg" />
			<div class="min-w-0">
				<p class="truncate font-medium text-neutral-100">{data.discord?.globalName ?? data.discord?.username ?? data.userName}</p>
				<p class="mt-1 font-mono text-xs text-neutral-400">{data.discord ? `@${data.discord.username}` : 'Signed in with Google'}</p>
				{#if data.discord?.discordId}<p class="mt-1 font-mono text-[10px] text-neutral-600">Discord ID · {data.discord.discordId}</p>{/if}
			</div>
		</div>
		<p class="mt-3 text-sm text-neutral-500">Discord or Google protects your sign-in. Your OVYN username, display name, bio and profile picture stay yours to customize.</p>
		<Button variant="secondary" onclick={logout} class="mt-4">Sign out</Button>
	</section>

	<PushNotificationSettings />

</div>
