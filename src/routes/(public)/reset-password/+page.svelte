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
	<p class="landing-eyebrow flex justify-center">pick something new</p>
	<div class="text-center">
		<h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">Choose a new password</h1>
	</div>

	<Card class="p-4 sm:p-5">
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

			{#if data.expired}
				<p class="text-sm text-amber-300" role="alert">This reset link is invalid or has expired. Request a new one.</p>
			{:else if error}
				<p class="text-sm text-red-400" role="alert">{error}</p>
			{/if}

			<a
				href="/forgot-password"
				class="text-center text-xs text-neutral-400 underline-offset-4 hover:text-neutral-200 hover:underline"
			>Request a new link</a>
		</form>
	</Card>
</section>