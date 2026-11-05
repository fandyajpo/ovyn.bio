<script lang="ts">
	import type { PageData } from './$types';
	import Card from '#lib/components/ui/Card.svelte';
	import Switch from '#lib/components/ui/Switch.svelte';

	type Form = { error?: string; ok?: string };

	let { data, form }: { data: PageData; form?: Form } = $props();

	const rows = [
		{
			key: 'auth.forgotPassword',
			label: 'Forgot password',
			description: 'Users can request a password-reset email and use reset links.'
		},
		{
			key: 'auth.credentialLogin',
			label: 'Credential login',
			description: 'Sign in or sign up with an email or username and a password.'
		},
		{
			key: 'auth.google',
			label: 'Google sign-in',
			description: 'Continue with Google. Provider credentials still come from the environment.'
		},
		{
			key: 'auth.discord',
			label: 'Discord sign-in',
			description: 'Continue with Discord.'
		}
	] as const;

	const allAuthOff = $derived(
		!data.flags['auth.forgotPassword'] &&
			!data.flags['auth.credentialLogin'] &&
			!data.flags['auth.google'] &&
			!data.flags['auth.discord']
	);
</script>

<svelte:head>
	<title>Manage auth - ovyn admin</title>
</svelte:head>

<div class="mx-auto flex max-w-3xl flex-col gap-7">
	<header>
		<span class="sticker sticker--lilac">FEATURES</span>
		<h1 class="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">Manage auth</h1>
		<p class="mt-1 max-w-2xl text-neutral-400">Turn sign-in methods on or off for everyone. Disabled methods are blocked server-side within a few seconds; the login page hides them too. Existing sessions keep working.</p>
	</header>

	{#if data.needsMigration}
		<p class="rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm text-amber-200" role="alert">
			The feature_flags table is missing. Run <code class="font-mono">pnpm run db:migrate</code>, then reload this page.
		</p>
	{/if}

	{#if allAuthOff}
		<p class="rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300" role="alert">
			Every sign-in method is currently off. Nobody can sign in — re-enable one here while your session is still alive.
		</p>
	{/if}

	{#if form?.error}<p class="rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300" role="alert">{form.error}</p>{/if}
	{#if form?.ok}<p class="rounded-xl border border-lime-300/40 bg-lime-300/10 px-4 py-3 text-sm text-lime-200" role="status">{form.ok}</p>{/if}

	<Card class="p-2">
		{#each rows as row (row.key)}
			<form method="POST" action="?/setFlag" class="feature-row">
				<input type="hidden" name="key" value={row.key} />
				<Switch name="enabled" label={row.label} description={row.description} checked={data.flags[row.key]} />
				<button type="submit" class="feature-save">Save</button>
			</form>
		{/each}
	</Card>
</div>

<style>
	.feature-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 1rem;
	}

	.feature-row + .feature-row {
		border-top: 1px solid var(--color-divider);
	}

	.feature-row :global(.switch-field) {
		flex: 1 1 auto;
	}

	.feature-save {
		flex: 0 0 auto;
		min-height: 2.2rem;
		border: 1px solid var(--color-divider);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-surface) 88%, transparent);
		padding: 0.35rem 0.85rem;
		color: var(--color-foreground);
		font: inherit;
		font-size: 0.72rem;
		font-weight: 600;
		cursor: pointer;
		transition: border-color 160ms ease, background-color 160ms ease;
	}

	.feature-save:hover {
		border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
		background: var(--color-accent-soft);
	}

	@media (prefers-reduced-motion: reduce) {
		.feature-save { transition: none; }
	}
</style>