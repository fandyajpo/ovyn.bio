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

	// The admin "Manage auth" toggles decide what this page shows. The server
	// enforces the same flags on /api/auth, so the UI is a mirror, not the gate.
	const anyMethod = $derived(data.credentialLogin || data.googleEnabled || data.discordEnabled);
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

		{#if !anyMethod}
			<Card class="p-4 sm:p-5">
				<p class="text-center text-sm text-neutral-400" role="status">Sign-in is temporarily unavailable. Please check back soon.</p>
			</Card>
		{:else}
			{#if data.credentialLogin}
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

						{#if data.forgotPassword}
							<a
								href="/forgot-password"
								class="text-xs text-neutral-400 underline-offset-4 hover:text-neutral-200 hover:underline"
							>Forgot your password?</a>
						{/if}
					</form>
				</Card>
			{:else}
				<Card class="p-4 sm:p-5">
					<p class="text-center text-sm text-neutral-400" role="status">Email and username sign-in is turned off right now. Continue with a social provider below.</p>
				</Card>
			{/if}

			{#if data.discordEnabled || data.googleEnabled}
				<div class="flex w-full items-center gap-4" aria-hidden="true">
					<span class="h-px flex-1 bg-neutral-800"></span>
					<span class="font-mono text-[10px] tracking-widest text-neutral-500">or continue with</span>
					<span class="h-px flex-1 bg-neutral-800"></span>
				</div>

				<div class="flex w-full flex-col gap-2">
					{#if data.discordEnabled}
						<Button onclick={() => login('discord')} loading={loadingProvider === 'discord'} disabled={loadingProvider !== null && loadingProvider !== 'discord'} class="w-full">
							{#if loadingProvider !== 'discord'}
								<svg class="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
									<path d="M20.317 4.492a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.036A19.736 19.736 0 0 0 3.677 4.492a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.594-3.549-13.56a.061.061 0 0 0-.031-.03zM8.02 15.265c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.418 2.157-2.418 1.21 0 2.176 1.095 2.157 2.418 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.095 2.157 2.418 0 1.334-.947 2.419-2.157 2.419z" />
								</svg>
							{/if}
							Continue with Discord
						</Button>
					{:else if data.discordConfigured}
						<Button disabled variant="secondary" class="w-full">Discord sign-in is off for now</Button>
					{:else}
						<Button disabled variant="secondary" class="w-full">Discord sign-in not configured yet</Button>
					{/if}

					{#if data.googleEnabled}
						<Button onclick={() => login('google')} loading={loadingProvider === 'google'} disabled={loadingProvider !== null && loadingProvider !== 'google'} variant="secondary" class="w-full">
							{#if loadingProvider !== 'google'}
								<svg class="size-4" viewBox="0 0 24 24" aria-hidden="true">
									<path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.26-2.09 3.55-5.16 3.55-8.87z" />
									<path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24z" />
									<path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28V6.63H1.29A12 12 0 0 0 0 12c0 1.94.46 3.77 1.29 5.37l3.98-3.09z" />
									<path fill="#EA4335" d="M12 4.76c1.76 0 3.34.6 4.58 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.63l3.98 3.09C6.22 6.87 8.87 4.76 12 4.76z" />
								</svg>
							{/if}
							Continue with Google
						</Button>
					{:else if data.googleConfigured}
						<Button disabled variant="secondary" class="w-full">Google sign-in is off for now</Button>
					{:else}
						<Button disabled variant="secondary" class="w-full">Google sign-in not configured yet</Button>
					{/if}
				</div>
			{/if}

			<p class="text-xs leading-6 text-neutral-500">
				Sign-in is only used to protect your account. Your ovyn profile identity stays yours to customize.
			</p>
			<p class="text-[11px] leading-5 text-neutral-600">
				By continuing you agree to the <a href="/terms" class="text-lime-300 hover:underline">Terms of Service</a> and the <a href="/privacy" class="text-lime-300 hover:underline">Privacy Policy</a>.
			</p>
		{/if}
	</div>

	<Card class="login-stage relative hidden isolate overflow-hidden lg:block">
		<PixelButterfly />
		<div class="landing-snail-range" aria-hidden="true">
			<LivingSnail />
		</div>
		<p class="landing-eyebrow login-stage-caption flex">make your corner of the internet</p>
	</Card>
</section>