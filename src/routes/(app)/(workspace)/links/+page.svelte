<script lang="ts">
	import type { PageData } from './$types';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import Select from '#lib/components/ui/Select.svelte';
	import { PROFILE_LINK_PROVIDER_IDS, PROFILE_LINK_PROVIDER_LABELS } from '#lib/schemas/profile-links';

	let { data, form }: { data: PageData; form?: { error?: string; ok?: string } } = $props();
	let provider = $state('instagram');
	const providerOptions = PROFILE_LINK_PROVIDER_IDS.map((value) => ({
		value,
		label: PROFILE_LINK_PROVIDER_LABELS[value]
	}));
</script>

<svelte:head>
	<title>Social links - ovyn</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div>
		<span class="sticker sticker--blue">YOUR INTERNET, ONE PAGE</span>
		<h1 class="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">Social links</h1>
		<p class="mt-1 max-w-2xl text-neutral-400">Add your public profiles, payment links, gaming profiles, crypto addresses or a custom URL. These links appear on your public page.</p>
	</div>

	{#if form?.error}<p class="text-sm text-red-400" role="alert">{form.error}</p>{/if}
	{#if form?.ok}<p class="text-sm text-lime-300" role="status">{form.ok}</p>{/if}

	<Card class="p-5">
		<h2 class="font-medium text-neutral-100">Add a link</h2>
		<form method="POST" action="?/add" class="mt-4 grid gap-4 sm:grid-cols-2">
			<Select name="provider" label="Platform" options={providerOptions} bind:value={provider} required />
			<Input
				name="url"
				label={provider === 'email' ? 'Email address' : provider === 'bitcoin' || provider === 'ethereum' || provider === 'litecoin' || provider === 'solana' || provider === 'xrp' || provider === 'monero' ? 'Wallet address or HTTPS explorer link' : 'Profile URL'}
				placeholder={provider === 'email' ? 'you@example.com' : 'https://…'}
				required
				maxlength={2048}
			/>
			{#if provider === 'custom_url'}
				<Input name="label" label="Link label" placeholder="My portfolio" required maxlength={48} class="sm:col-span-2" />
			{/if}
			<div class="sm:col-span-2"><Button type="submit">Add link</Button></div>
		</form>
		<p class="mt-3 text-xs text-neutral-500">Links are shown publicly on your profile. Only HTTPS web links are accepted for social platforms; email and wallet links use their expected address format.</p>
	</Card>

	<section class="flex flex-col gap-3">
		<div class="flex items-center justify-between gap-3">
			<h2 class="font-[family-name:var(--font-display)] text-xl font-semibold">Your links</h2>
			<span class="font-mono text-xs text-neutral-500">{data.links.length} / 40</span>
		</div>
		{#if data.links.length === 0}
			<Card class="p-6 text-sm text-neutral-500">Your page is link-free for now. Add the places people can find you.</Card>
		{:else}
			<div class="grid gap-3 sm:grid-cols-2">
				{#each data.links as link (link.id)}
					<Card class="flex min-w-0 items-center justify-between gap-3 p-4">
						<div class="min-w-0">
							<p class="font-mono text-[10px] uppercase tracking-wider text-neutral-500">{link.provider.replaceAll('_', ' ')}</p>
							<a href={link.url} target="_blank" rel="noopener noreferrer nofollow" class="mt-1 block truncate font-medium text-lime-300 hover:underline">{link.label}</a>
						</div>
						<form method="POST" action="?/remove">
							<input type="hidden" name="id" value={link.id} />
							<button type="submit" class="rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-400 transition hover:border-red-400/50 hover:text-red-300" aria-label="Remove {link.label}">Remove</button>
						</form>
					</Card>
				{/each}
			</div>
		{/if}
	</section>
</div>
