<script lang="ts">
	import { goto } from '$app/navigation';
	import { signIn } from '#lib/auth-client';
	import Button from '#lib/components/ui/Button.svelte';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form?: { error?: string } } = $props();
	let loadingProvider = $state<'discord' | 'google' | null>(null);
	let error = $state<string | null>(null);
	const initialError = $derived(form?.error ?? null);

	async function login(provider: 'discord' | 'google') {
		loadingProvider = provider;
		error = null;
		const { error: err } = await signIn.social({ provider, callbackURL: '/account' });
		if (err) {
			loadingProvider = null;
			error = err.message ?? 'Sign-in failed. Please try again.';
			return;
		}
		await goto('/account');
	}
</script>

<svelte:head>
	<title>Sign in - ovyn</title>
</svelte:head>

<div class="mx-auto flex min-h-[65svh] max-w-md flex-col items-center justify-center gap-6 py-16 text-center">
	<p class="landing-eyebrow justify-center">YOUR SPACE IS WAITING</p>
	<div>
		<h1 class="text-3xl font-semibold tracking-tight">Welcome to ovyn</h1>
		<p class="mt-3 text-neutral-400">Sign in and make a corner of the internet your own.</p>
	</div>

	<div class="flex w-full flex-col gap-3">
		<Button onclick={() => login('discord')} loading={loadingProvider === 'discord'} disabled={loadingProvider !== null && loadingProvider !== 'discord'} class="w-full">Continue with Discord</Button>
		{#if data.googleEnabled}
			<Button onclick={() => login('google')} loading={loadingProvider === 'google'} disabled={loadingProvider !== null && loadingProvider !== 'google'} variant="secondary" class="w-full">Continue with Google</Button>
		{:else}
			<Button disabled variant="secondary" class="w-full">Google sign-in not configured yet</Button>
		{/if}
	</div>

	{#if error || initialError}
		<p class="text-sm text-red-400" role="alert">{error ?? initialError}</p>
	{/if}

	<p class="max-w-sm text-xs leading-6 text-neutral-500">
		Sign-in is only used to protect your account. Your ovyn profile identity stays yours to customize.
	</p>
	<p class="max-w-sm text-xs leading-6 text-neutral-600">
		By continuing you agree to the <a href="/terms" class="text-lime-300 hover:underline">Terms of Service</a> and the <a href="/privacy" class="text-lime-300 hover:underline">Privacy Policy</a>.
	</p>
</div>
