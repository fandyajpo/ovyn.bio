<script lang="ts">
	import { goto } from '$app/navigation';
	import { signIn } from '#lib/auth-client';
	import Button from '#lib/components/ui/Button.svelte';

	let { form }: { form?: { error?: string } } = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);

	const initialError = $derived(form?.error ?? null);

	async function login() {
		loading = true;
		error = null;
		const { error: err } = await signIn.social({
			provider: 'discord',
			callbackURL: '/account'
		});
		if (err) {
			loading = false;
			error = err.message ?? 'Sign-in failed. Please try again.';
			return;
		}
		await goto('/account');
	}
</script>

<svelte:head>
	<title>Sign in — OVYN</title>
</svelte:head>

<div class="mx-auto flex max-w-md flex-col items-center gap-6 py-20 text-center">
	<h1 class="font-[family-name:var(--font-display)] text-3xl font-bold">Sign in to OVYN</h1>
	<p class="text-neutral-400">One account, one identity. Sign in with Discord to continue.</p>

	<Button onclick={login} loading={loading} class="w-full">Continue with Discord</Button>

	{#if error || initialError}
		<p class="text-sm text-red-400" role="alert">{error ?? initialError}</p>
	{/if}

	<p class="text-xs text-neutral-600">
		We only request your Discord identity (identify scope). Your email stays yours.
	</p>
</div>
