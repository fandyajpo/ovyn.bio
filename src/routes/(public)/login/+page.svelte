<script lang="ts">
	import { goto } from '$app/navigation';
	import { signIn, signUp } from '#lib/auth-client';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import LivingSnail from '#lib/components/LivingSnail.svelte';
	import PixelButterfly from '#lib/components/PixelButterfly.svelte';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form?: { error?: string } } = $props();
	let mode = $state<'signin' | 'signup'>('signin');
	let loadingProvider = $state<'discord' | 'google' | null>(null);
	let credentialLoading = $state(false);
	let error = $state<string | null>(null);
	const initialError = $derived(form?.error ?? null);

	// Sign-in fields: one identifier covers both email and username.
	let identifier = $state('');
	let password = $state('');

	// Sign-up fields.
	let name = $state('');
	let username = $state('');
	let signupEmail = $state('');
	let signupPassword = $state('');

	function credentialError(err: { message?: string | null; status?: number; code?: string }) {
		if (err.code === 'INVALID_EMAIL_OR_PASSWORD' || err.status === 401) {
			return 'Wrong email or username, or the password does not match.';
		}
		if (err.code === 'USER_ALREADY_EXISTS') return 'That email is already registered. Sign in instead.';
		if (err.code === 'USERNAME_IS_ALREADY_TAKEN') return 'That username is already taken.';
		return err.message ?? 'Sign-in failed. Please try again.';
	}

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

	async function submitCredentials(event: SubmitEvent) {
		event.preventDefault();
		if (credentialLoading) return;
		credentialLoading = true;
		error = null;
		try {
			let err: { message?: string | null; status?: number; code?: string } | null = null;
			if (mode === 'signin') {
				const id = identifier.trim();
				const result = id.includes('@')
					? await signIn.email({ email: id, password })
					: await signIn.username({ username: id.toLowerCase(), password });
				err = result.error;
			} else {
				const result = await signUp.email({
					email: signupEmail.trim(),
					password: signupPassword,
					name: name.trim() || username.trim(),
					username: username.trim().toLowerCase(),
					callbackURL: '/account'
				});
				err = result.error;
			}
			if (err) {
				error = credentialError(err);
				return;
			}
			await goto('/account');
		} catch {
			error = 'Sign-in failed. Please try again.';
		} finally {
			credentialLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Sign in - ovyn</title>
</svelte:head>

<!-- Phones: one compact column, buttons right after the fields. Desktop: the
     form keeps the left side while the landing snail and butterfly play on a
     frosted stage to the right, over the liquid backdrop. -->
<section class="login-split relative isolate lg:grid lg:min-h-[calc(100svh-10rem)] lg:grid-cols-[minmax(0,26rem)_1fr] lg:items-center lg:gap-10">
	<div class="mx-auto flex w-full max-w-sm flex-col justify-center gap-5 py-6 sm:py-10 lg:max-w-none lg:py-0">
		<p class="landing-eyebrow flex justify-center lg:justify-start">your space is waiting</p>
		<div class="text-center lg:text-left">
			<h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome to ovyn</h1>
			<p class="mt-2 text-sm text-neutral-400 sm:mt-3 sm:text-base">Sign in and make a corner of the internet your own.</p>
		</div>

		<Card class="p-4 sm:p-5">
			<form onsubmit={submitCredentials} class="flex flex-col gap-3 text-left">
				{#if mode === 'signin'}
					<Input
						name="identifier"
						label="Email or username"
						bind:value={identifier}
						autocomplete="username"
						required
					/>
					<Input
						name="password"
						label="Password"
						type="password"
						bind:value={password}
						autocomplete="current-password"
						required
					/>
				{:else}
					<Input name="name" label="Display name" bind:value={name} autocomplete="name" />
					<Input
						name="username"
						label="Username"
						bind:value={username}
						autocomplete="username"
						hint="Lowercase letters, numbers, dots and dashes. This becomes your page link."
						required
					/>
					<Input name="email" label="Email" type="email" bind:value={signupEmail} autocomplete="email" required />
					<Input
						name="password"
						label="Password"
						type="password"
						bind:value={signupPassword}
						autocomplete="new-password"
						minlength={8}
						required
					/>
				{/if}

				<Button type="submit" loading={credentialLoading} disabled={credentialLoading} class="mt-1 w-full">
					{mode === 'signin' ? 'Sign in' : 'Create your account'}
				</Button>

				{#if error || initialError}
					<p class="text-sm text-red-400" role="alert">{error ?? initialError}</p>
				{/if}

				<button
					type="button"
					class="text-xs text-neutral-400 underline-offset-4 hover:text-neutral-200 hover:underline"
					onclick={() => {
						mode = mode === 'signin' ? 'signup' : 'signin';
						error = null;
					}}
				>
					{mode === 'signin' ? 'New to ovyn? Create an account' : 'Already have an account? Sign in'}
				</button>
			</form>
		</Card>

		<div class="flex w-full items-center gap-4" aria-hidden="true">
			<span class="h-px flex-1 bg-neutral-800"></span>
			<span class="font-mono text-[10px] tracking-widest text-neutral-500">or continue with</span>
			<span class="h-px flex-1 bg-neutral-800"></span>
		</div>

		<div class="flex w-full flex-col gap-2">
			<Button onclick={() => login('discord')} loading={loadingProvider === 'discord'} disabled={loadingProvider !== null && loadingProvider !== 'discord'} class="w-full">Continue with Discord</Button>
			{#if data.googleEnabled}
				<Button onclick={() => login('google')} loading={loadingProvider === 'google'} disabled={loadingProvider !== null && loadingProvider !== 'google'} variant="secondary" class="w-full">Continue with Google</Button>
			{:else}
				<Button disabled variant="secondary" class="w-full">Google sign-in not configured yet</Button>
			{/if}
		</div>

		<p class="text-xs leading-6 text-neutral-500">
			Sign-in is only used to protect your account. Your ovyn profile identity stays yours to customize.
		</p>
		<p class="text-[11px] leading-5 text-neutral-600">
			By continuing you agree to the <a href="/terms" class="text-lime-300 hover:underline">Terms of Service</a> and the <a href="/privacy" class="text-lime-300 hover:underline">Privacy Policy</a>.
		</p>
	</div>

	<Card class="login-stage relative hidden isolate overflow-hidden lg:block">
		<PixelButterfly />
		<div class="landing-snail-range" aria-hidden="true">
			<LivingSnail />
		</div>
		<p class="landing-eyebrow login-stage-caption flex">make your corner of the internet</p>
	</Card>
</section>