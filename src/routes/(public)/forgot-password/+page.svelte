<script lang="ts">
	import { requestPasswordReset } from '#lib/auth-client';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Input from '#lib/components/ui/Input.svelte';

	let email = $state('');
	let sentTo = $state<string | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (loading) return;
		loading = true;
		error = null;
		const { error: err } = await requestPasswordReset({
			email: email.trim(),
			redirectTo: `${window.location.origin}/reset-password`
		});
		loading = false;
		if (err) {
			error = err.message ?? 'Could not send the reset email. Try again.';
			return;
		}
		// The endpoint answers the same way for unknown addresses, so no
		// information about which emails are registered ever leaks.
		sentTo = email.trim();
	}
</script>

<svelte:head>
	<title>Reset password - ovyn</title>
</svelte:head>

<section class="mx-auto flex min-h-[60svh] w-full max-w-sm flex-col justify-center gap-5 py-6 sm:py-10">
	<p class="landing-eyebrow flex justify-center">back into your corner</p>
	<div class="text-center">
		<h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
			{sentTo ? 'Check your inbox' : 'Forgot your password?'}
		</h1>
		<p class="mt-2 text-sm text-neutral-400">
			{sentTo ? 'A reset link is on its way.' : "Enter your email and we'll send a reset link."}
		</p>
	</div>

	<Card class="p-4 sm:p-5">
		{#if sentTo}
			<div class="flex flex-col items-center gap-3 text-center" role="status">
				<svg class="size-9 text-lime-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" d="M21.75 9.75a8.25 8.25 0 1 0-16.5 0v4.5c0 4.415 3.675 8.25 8.25 8.25s8.25-3.835 8.25-8.25v-4.5Z" />
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75l2.25 2.25L15.75 10.5" />
				</svg>
				<p class="text-sm text-neutral-300">If that address matches an account, a reset link is on its way.</p>
				<p class="font-mono text-xs text-neutral-500">{sentTo} · link works for 1 hour</p>
				<button
					type="button"
					class="text-xs text-neutral-400 underline-offset-4 hover:text-neutral-200 hover:underline"
					onclick={() => {
						sentTo = null;
						email = '';
					}}
				>
					Use a different email
				</button>
			</div>
		{:else}
			<form onsubmit={submit} class="flex flex-col gap-3 text-left">
				<Input
					name="email"
					label="Email"
					type="email"
					bind:value={email}
					autocomplete="email"
					required
				/>
				<Button type="submit" loading={loading} disabled={loading} class="mt-1 w-full">Send reset link</Button>
				{#if error}
					<p class="text-sm text-red-400" role="alert">{error}</p>
				{/if}
			</form>
		{/if}
	</Card>

	<p class="text-center text-xs text-neutral-500">
		Remembered it? <a href="/login" class="text-lime-300 hover:underline">Back to sign-in</a>
	</p>
</section>