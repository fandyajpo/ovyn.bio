<script lang="ts">
	import { forgotPassword } from '#lib/auth-client';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Input from '#lib/components/ui/Input.svelte';

	let email = $state('');
	let loading = $state(false);
	let sent = $state(false);
	let error = $state<string | null>(null);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (loading) return;
		loading = true;
		error = null;
		const { error: err } = await forgotPassword({
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
		sent = true;
	}
</script>

<svelte:head>
	<title>Reset password - ovyn</title>
</svelte:head>

<section class="mx-auto flex min-h-[60svh] w-full max-w-sm flex-col justify-center gap-5 py-6 sm:py-10">
	<p class="landing-eyebrow flex justify-center">back into your corner</p>
	<div class="text-center">
		<h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">Forgot your password?</h1>
		<p class="mt-2 text-sm text-neutral-400">Enter your email and we'll send a reset link.</p>
	</div>

	<Card class="p-4 sm:p-5">
		{#if sent}
			<p class="text-sm text-neutral-300" role="status">
				If that address matches an account, a reset link is on its way. Check your inbox.
			</p>
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