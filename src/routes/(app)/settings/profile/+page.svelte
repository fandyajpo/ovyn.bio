<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import UploadButton from '#lib/components/UploadButton.svelte';

	let { data, form }: {
		data: PageData;
		form?: { error?: string; ok?: boolean };
	} = $props();

	// Identity is Discord-synced (read-only here).
	const displayName = $derived(
		data.profile.displayName || data.discord?.globalName || data.discord?.username || data.profile.slug
	);

	let visibility = $state<string>(data.profile.visibility);

	async function onVisibilityChange() {
		const res = await fetch('/settings/profile?/visibility', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({ visibility })
		});
		if (res.ok) goto('', { replaceState: true });
	}
</script>

<svelte:head>
	<title>Profile settings — OVYN</title>
</svelte:head>

<div class="mx-auto flex max-w-2xl flex-col gap-8">
	<div>
		<h1 class="font-[family-name:var(--font-display)] text-3xl font-bold">Profile settings</h1>
		<p class="mt-1 text-neutral-400">
			Your name, username and avatar come from Discord and stay in sync.
		</p>
	</div>

	{#if form?.ok}
		<p class="rounded-lg border border-lime-300/40 bg-lime-300/10 px-4 py-3 text-sm text-lime-200" role="status">
			Saved.
		</p>
	{/if}

	<section class="flex items-center gap-4 rounded-xl border border-neutral-800 p-5">
		<Avatar name={displayName} src={data.avatarUrl} size="lg" />
		<div class="min-w-0">
			<p class="truncate font-medium text-neutral-100">{displayName}</p>
			<p class="font-mono text-xs text-neutral-500">ovyn.bio/{data.profile.slug}</p>
			{#if data.discord}
				<p class="font-mono text-xs text-neutral-600">discord: {data.discord.username}</p>
			{/if}
			<a href="/settings/account" class="mt-1 inline-block text-xs text-neutral-500 hover:text-neutral-300">
				Managed by Discord — account settings
			</a>
		</div>
	</section>

	<section class="rounded-xl border border-neutral-800 p-5">
		<h2 class="mb-4 font-medium text-neutral-200">Page wallpaper</h2>
		<div class="flex items-center gap-4">
			<div class="h-14 w-24 overflow-hidden rounded-lg bg-neutral-800">
				{#if data.bannerUrl}
					<img src={data.bannerUrl} alt="Wallpaper preview" class="size-full object-cover" />
				{/if}
			</div>
			<div>
				<p class="mb-1 text-sm text-neutral-300">Your page background image</p>
				<p class="mb-1 text-xs text-neutral-500">JPG, PNG or WebP · max 5 MB</p>
				<UploadButton kind="banner" existingKey={data.profile.bannerKey} label="Upload wallpaper" />
			</div>
		</div>
	</section>

	<section class="rounded-xl border border-neutral-800 p-5">
		<h2 class="mb-3 font-medium text-neutral-200">Page visibility</h2>
		<label class="flex items-center gap-3 text-sm text-neutral-300">
			<input
				type="checkbox"
				checked={visibility === 'public'}
				onchange={() => {
					visibility = visibility === 'public' ? 'private' : 'public';
					onVisibilityChange();
				}}
			/>
			Public profile — anyone can visit ovyn.bio/{data.profile.slug}
		</label>
		{#if form?.error}
			<p class="mt-2 text-sm text-red-400" role="alert">{form.error}</p>
		{/if}
	</section>
</div>
