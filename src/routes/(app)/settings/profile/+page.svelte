<script lang="ts">
	import type { PageData } from './$types';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import UploadButton from '$lib/components/UploadButton.svelte';

	let { data, form }: {
		data: PageData;
		form?: { error?: string; ok?: boolean };
	} = $props();

	let displayName = $state(data.profile.displayName ?? '');
	let slug = $state(data.profile.slug);
	let bio = $state(data.profile.bio ?? '');
	let visibility = $state<string>(data.profile.visibility);

	const previewSlug = $derived(
		slug
			.normalize('NFKD')
			.toLowerCase()
			.replace(/[^a-z0-9._-]+/g, '-')
			.replace(/^-+|-+$/g, '')
	);
</script>

<svelte:head>
	<title>Profile settings — OVYN</title>
</svelte:head>

<div class="mx-auto flex max-w-2xl flex-col gap-8">
	<div>
		<h1 class="font-[family-name:var(--font-display)] text-3xl font-bold">Profile settings</h1>
		<p class="mt-1 text-neutral-400">This is how the world sees you at ovyn.bio.</p>
	</div>

	{#if form?.ok}
		<p class="rounded-lg border border-lime-300/40 bg-lime-300/10 px-4 py-3 text-sm text-lime-200" role="status">
			Profile saved.
		</p>
	{/if}

	<section class="rounded-xl border border-neutral-800 p-5">
		<h2 class="mb-4 font-medium text-neutral-200">Images</h2>
		<div class="flex flex-wrap items-center gap-6">
			<div class="flex items-center gap-3">
				<Avatar name={displayName || data.profile.slug} src={data.avatarUrl} size="lg" />
				<div>
					<p class="text-sm text-neutral-300">Avatar</p>
					<p class="mb-1 text-xs text-neutral-500">JPG, PNG or WebP · max 2 MB</p>
					<UploadButton kind="avatar" existingKey={data.profile.avatarKey} label="Upload avatar" />
				</div>
			</div>
			<div class="flex items-center gap-3">
				<div class="h-12 w-20 overflow-hidden rounded-lg bg-neutral-800">
					{#if data.bannerUrl}
						<img src={data.bannerUrl} alt="Banner preview" class="size-full object-cover" />
					{/if}
				</div>
				<div>
					<p class="text-sm text-neutral-300">Banner</p>
					<p class="mb-1 text-xs text-neutral-500">JPG, PNG or WebP · max 5 MB</p>
					<UploadButton kind="banner" existingKey={data.profile.bannerKey} label="Upload banner" />
				</div>
			</div>
		</div>
	</section>

	<form method="POST" action="/settings/profile" class="flex flex-col gap-5">
		<div class="grid gap-5 sm:grid-cols-2">
			<Input name="displayName" label="Display name" bind:value={displayName} required maxlength={50} />
			<div>
				<Input name="slug" label="Username" bind:value={slug} required minlength={2} maxlength={32} />
				<p class="mt-1 font-mono text-xs text-neutral-600">ovyn.bio/{previewSlug}</p>
			</div>
		</div>

		<Input name="bio" label="Bio" bind:value={bio} textarea maxlength={500} />

		<fieldset class="flex items-center gap-3">
			<legend class="mb-1.5 text-sm font-medium text-neutral-300">Profile visibility</legend>
			<label class="flex items-center gap-2 text-sm text-neutral-300">
				<input type="radio" name="visibility" value="public" bind:group={visibility} /> Public
			</label>
			<label class="flex items-center gap-2 text-sm text-neutral-300">
				<input type="radio" name="visibility" value="private" bind:group={visibility} /> Private
			</label>
		</fieldset>

		{#if form?.error}
			<p class="text-sm text-red-400" role="alert">{form.error}</p>
		{/if}

		<Button type="submit">Save changes</Button>
	</form>
</div>
