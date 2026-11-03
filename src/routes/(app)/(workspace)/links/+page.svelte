<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { superForm } from 'sveltekit-superforms';
	import type { PageData } from './$types';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import Select from '#lib/components/ui/Select.svelte';
	import LinkProviderIcon from '#lib/components/LinkProviderIcon.svelte';
	import {
		PROFILE_LINK_PROVIDER_IDS,
		PROFILE_LINK_PROVIDER_LABELS,
		type ProfileLinkProvider
	} from '#lib/schemas/profile-links';

	let { data, form }: { data: PageData; form?: { error?: string; ok?: string } } = $props();

	// The add form is owned by Superforms: shared Zod schema, server validation,
	// pending and message state, and progressive enhancement in one place.
	const {
		form: addForm,
		errors: addErrors,
		message: addMessage,
		enhance: enhanceAdd,
		submitting: addSubmitting
	} = superForm(untrack(() => data.form));

	const providerOptions = PROFILE_LINK_PROVIDER_IDS.map((value) => ({
		value,
		label: PROFILE_LINK_PROVIDER_LABELS[value]
	}));

	type EditableLink = { id: string; provider: string; label: string; url: string };
	let editing = $state<EditableLink | null>(null);

	function providerLabel(value: string) {
		return PROFILE_LINK_PROVIDER_LABELS[value as ProfileLinkProvider] ?? value;
	}

	const CRYPTO_PROVIDERS = ['bitcoin', 'ethereum', 'litecoin', 'solana', 'xrp', 'monero'];

	function isCrypto(value: string) {
		return CRYPTO_PROVIDERS.includes(value);
	}

	function urlLabel(value: string) {
		if (value === 'email') return 'Email address';
		return isCrypto(value) ? 'Wallet address or HTTPS explorer link' : 'Profile URL';
	}

	function urlPlaceholder(value: string) {
		return value === 'email' ? 'you@example.com' : 'https://…';
	}

	function startEdit(link: EditableLink) {
		editing = { id: link.id, provider: link.provider, label: link.label, url: link.url };
	}

	function cancelEdit() {
		editing = null;
	}

	// A successful add, update or remove closes the editor.
	$effect(() => {
		if (form?.ok) editing = null;
	});
</script>

{#snippet providerOption(option: { value: string; label: string; disabled?: boolean })}
	<LinkProviderIcon provider={option.value} size="sm" />
{/snippet}

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
		<form method="POST" action="?/add" use:enhance={enhanceAdd} class="mt-4 grid gap-4 sm:grid-cols-2">
			<Select
				name="provider"
				label="Platform"
				options={providerOptions}
				bind:value={$addForm.provider}
				required
				optionIcon={providerOption}
				error={$addErrors.provider?.[0] ?? null}
			/>
			<Input
				name="url"
				label={urlLabel($addForm.provider)}
				placeholder={urlPlaceholder($addForm.provider)}
				bind:value={$addForm.url}
				required
				maxlength={2048}
				error={$addErrors.url?.[0] ?? null}
			/>
			{#if $addForm.provider === 'custom_url'}
				<Input
					name="label"
					label="Link label"
					placeholder="My portfolio"
					bind:value={$addForm.label}
					required
					maxlength={48}
					class="sm:col-span-2"
					error={$addErrors.label?.[0] ?? null}
				/>
			{/if}
			{#if $addMessage}
				<p class="text-sm text-neutral-300 sm:col-span-2" role="status">{$addMessage}</p>
			{/if}
			<div class="sm:col-span-2"><Button type="submit" loading={$addSubmitting}>Add link</Button></div>
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
					<Card class="min-w-0 p-4">
						<div class="flex items-start justify-between gap-3">
							<div class="flex min-w-0 items-center gap-3">
								<LinkProviderIcon provider={link.provider} />
								<div class="min-w-0">
									<p class="font-mono text-[10px] uppercase tracking-wider text-neutral-500">{providerLabel(link.provider)}</p>
									<a href={link.url} target="_blank" rel="noopener noreferrer nofollow" class="mt-1 block truncate font-medium text-lime-300 hover:underline">{link.label}</a>
								</div>
							</div>
							<div class="flex shrink-0 items-center gap-2">
								<button
									type="button"
									onclick={() => startEdit(link)}
									class="rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-300 transition hover:border-lime-300/50 hover:text-lime-300"
									aria-label="Edit {link.label}"
								>
									Edit
								</button>
								<form method="POST" action="?/remove">
									<input type="hidden" name="id" value={link.id} />
									<button type="submit" class="rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-400 transition hover:border-red-400/50 hover:text-red-300" aria-label="Remove {link.label}">Remove</button>
								</form>
							</div>
						</div>

						{#if editing && editing.id === link.id}
							<form
								method="POST"
								action="?/update"
								class="mt-4 grid gap-4 border-t border-neutral-800 pt-4 sm:grid-cols-2"
							>
								<input type="hidden" name="id" value={link.id} />
								<Select name="provider" label="Platform" options={providerOptions} bind:value={editing.provider} required optionIcon={providerOption} />
								<Input
									name="url"
									label={urlLabel(editing.provider)}
									placeholder={urlPlaceholder(editing.provider)}
									bind:value={editing.url}
									required
									maxlength={2048}
								/>
								{#if editing.provider === 'custom_url'}
									<Input name="label" label="Link label" placeholder="My portfolio" bind:value={editing.label} required maxlength={48} class="sm:col-span-2" />
								{/if}
								<div class="flex flex-wrap items-center gap-2 sm:col-span-2">
									<Button type="submit">Save changes</Button>
									<button type="button" onclick={cancelEdit} class="rounded-full border border-neutral-700 px-3.5 py-2 text-xs text-neutral-300 transition hover:bg-neutral-800">Cancel</button>
								</div>
							</form>
						{/if}
					</Card>
				{/each}
			</div>
		{/if}
	</section>
</div>
