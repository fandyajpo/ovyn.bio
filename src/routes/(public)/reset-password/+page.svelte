<script lang="ts">
	import { goto } from '$app/navigation';
	import { resetPassword } from '#lib/auth-client';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let newPassword = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Without a token there is nothing to complete - show the request form only.
	const linkUsable = $derived(Boolean(data.token) && !data.expired);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (loading) return;
		if (newPassword.length < 8) {
			error = 'Use at least 8 characters.';
			return;
		}
		if (newPassword !== confirmPassword) {
			error = 'The passwords do not match.';
			return;
		}
		loading = true;
		error = null;
		const { error: err } = await resetPassword({
			newPassword,
			token: data.token ?? ''
		});
		loading = false;
		if (err) {
			error = err.message ?? 'This reset link is invalid or expired. Request a new one.';
			return;
		}
		await goto('/login');
	}
</script>

<svelte:head>
	<title>Choose a new password - ovyn</title>
</svelte:head>

<section class="mx-auto flex min-h-[60svh] w-full max-w-sm flex-col justify-center gap-5 py-6 sm:py-10">
	<p class="landing-eyebrow flex justify-center">{linkUsable ? 'pick something new' : 'reset link trouble'}</p>
	<div class="text-center">
		<h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
			{linkUsable ? 'Choose a new password' : 'This link does not work'}
		</h1>
		{#if linkUsable}
			<p class="mt-2 text-sm text-neutral-400">Make it long and something you have not used elsewhere.</p>
		{:else if data.expired}
			<p class="mt-2 text-sm text-neutral-400">Reset links are single-use and only live for 1 hour.</p>
		{/if}
	</div>

	<Card class="p-4 sm:p-5">
		{#if linkUsable}
			<form onsubmit={submit} class="flex flex-col gap-3 text-left">
				<Input
					name="password"
					label="New password"
					type="password"
					bind:value={newPassword}
					autocomplete="new-password"
					minlength={8}
					required
				/>
				<Input
					name="confirm"
					label="Repeat the new password"
					type="password"
					bind:value={confirmPassword}
					autocomplete="new-password"
					minlength={8}
					required
				/>
				<Button type="submit" loading={loading} disabled={loading} class="mt-1 w-full">Save the new password</Button>
				{#if error}
					<p class="text-sm text-red-400" role="alert">{error}</p>
				{/if}
			</form>
		{:else}
			<div class="flex flex-col items-center gap-3 text-center" role="alert">
				<svg class="size-9 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-1.5a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
				</svg>
				<p class="text-sm text-neutral-300">This reset link is invalid or has expired.</p>
				<a href="/forgot-password" class="w-full">
					<Button class="w-full">Send a new reset link</Button>
				</a>
			</div>
		{/if}
	</Card>

	<p class="text-center text-xs text-neutral-500">
		Remembered it? <a href="/login" class="text-lime-300 hover:underline">Back to sign-in</a>
	</p>
</section>