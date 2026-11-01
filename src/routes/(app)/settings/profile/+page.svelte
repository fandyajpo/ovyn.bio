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
		<h2 class="mb-1 font-medium text-neutral-200">Cosmetics</h2>
		<p class="mb-4 text-sm text-neutral-400">
			Owned frames, wallpapers and badges. Get more in the <a href="/shop" class="text-lime-300 hover:underline">shop</a>.
		</p>

		{#each (Object.keys(data.owned) as kind) as kindKey (kindKey)}
			{@const owned = data.owned[kindKey as keyof typeof data.owned]}
			<h3 class="mt-3 mb-2 font-mono text-xs text-neutral-500 uppercase">{kindKey}s</h3>
			{#if owned.length === 0}
				<p class="text-xs text-neutral-600">None owned yet.</p>
			{:else}
				<div class="flex flex-wrap gap-2">
					<form method="POST" action="/settings/profile?/equip">
						<input type="hidden" name="kind" value={kindKey} />
						<input type="hidden" name="cosmeticId" value="" />
						<button
							type="submit"
							class="rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-400 transition-colors hover:bg-neutral-800"
						>
							None
						</button>
					</form>
					{#each owned as c (c.id)}
						<form method="POST" action="/settings/profile?/equip">
							<input type="hidden" name="kind" value={c.kind} />
							<input type="hidden" name="cosmeticId" value={c.id} />
							<button
								type="submit"
								class="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors
									{data.profile.equippedFrameId === c.id
									|| data.profile.equippedWallpaperId === c.id
									|| data.profile.equippedBadgeId === c.id
									? 'border-lime-300/50 bg-lime-300/10 text-lime-300'
									: 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'}"
							>
								{c.name}
							</button>
						</form>
					{/each}
				</div>
			{/if}
		{/each}
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
