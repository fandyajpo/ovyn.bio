<script lang="ts">
	import type { PageData } from './$types';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Select from '#lib/components/ui/Select.svelte';
	import UploadButton from '#lib/components/UploadButton.svelte';
	import { PROFILE_THEME_OPTIONS } from '#lib/schemas/profile';

	let { data, form }: { data: PageData; form?: { error?: string; ok?: string } } = $props();
	const themeOptions = PROFILE_THEME_OPTIONS.map((option) => ({ ...option }));
	const backgroundIsVideo = $derived(/\.(mp4|webm)$/i.test(data.profile.bannerKey ?? ''));
	const backgroundVideoType = $derived(data.profile.bannerKey?.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4');
</script>

<svelte:head>
	<title>Customize your page - OVYN</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div>
		<span class="sticker sticker--pink">MAKE IT YOURS</span>
		<h1 class="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">Customize your page</h1>
		<p class="mt-1 text-neutral-400">Choose a visual theme and personalize your picture, background, audio and cursor. <a href="/settings/profile" class="text-lime-300 hover:underline">Edit your name, username and bio</a>.</p>
	</div>

	{#if form?.error}<p class="text-sm text-red-400" role="alert">{form.error}</p>{/if}
	{#if form?.ok}<p class="text-sm text-lime-300" role="status">{form.ok}</p>{/if}

	<Card class="flex flex-col gap-4 p-5">
		<div class="flex items-center gap-4">
			<Avatar name={data.profile.displayName || data.profile.slug} src={data.avatarUrl} size="lg" />
			<div>
				<h2 class="font-medium text-neutral-100">Profile avatar</h2>
				<p class="mt-1 text-xs text-neutral-500">Choose a custom image or restore your sign-in account picture.</p>
			</div>
		</div>
		<div class="flex flex-wrap gap-2">
			<UploadButton kind="avatar" existingKey={data.profile.avatarKey} label="Upload avatar" />
			{#if data.profile.avatarKey}
				<form method="POST" action="?/avatarReset">
					<Button type="submit" variant="ghost">Use account picture</Button>
				</form>
			{/if}
		</div>
	</Card>

	<Card class="flex flex-col gap-4 p-5">
		<h2 class="font-medium text-neutral-100">Page background</h2>
		<div class="flex items-center gap-4">
			{#if data.bannerUrl}
				{#if backgroundIsVideo}
					<video autoplay loop muted playsinline preload="metadata" aria-hidden="true" tabindex="-1" class="h-16 w-28 rounded-xl object-cover"><source src={data.bannerUrl} type={backgroundVideoType} /></video>
				{:else}
					<img src={data.bannerUrl} alt="Current background preview" class="h-16 w-28 rounded-xl object-cover" />
				{/if}
			{:else}
				<div class="h-16 w-28 rounded-xl border border-dashed border-neutral-700 bg-neutral-900"></div>
			{/if}
			<div>
				<p class="text-sm text-neutral-300">Upload a still or animated background.</p>
				<p class="mt-1 text-xs text-neutral-500">JPG, PNG, WebP, GIF, MP4 or WebM · max 25 MB</p>
			</div>
		</div>
		<UploadButton kind="banner" existingKey={data.profile.bannerKey} label="Upload background" />
	</Card>

	<Card class="flex flex-col gap-4 p-5">
		<h2 class="font-medium text-neutral-100">Theme</h2>
		<p class="text-sm text-neutral-400">Themes can also be saved as templates and shared with the community.</p>
		<form method="POST" action="?/theme" class="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
			<Select name="theme" label="Page theme" options={themeOptions} value={data.profile.theme} class="w-full sm:max-w-sm" />
			<Button type="submit">Save theme</Button>
		</form>
		<div class="template-preview max-w-xl rounded-xl p-5" data-profile-theme={data.profile.theme}>
			<span class="sticker sticker--dark">LIVE PREVIEW</span>
			<p class="mt-4 font-[family-name:var(--font-display)] text-xl font-bold">{data.profile.displayName || data.profile.slug}</p>
			<p class="font-mono text-xs">ovyn.bio/{data.profile.slug}</p>
		</div>
	</Card>

	<Card class="flex flex-col gap-4 p-5">
		<div>
			<h2 class="font-medium text-neutral-100">Background audio</h2>
			<p class="mt-1 text-sm text-neutral-400">Visitors choose when to play it; audio will never autoplay.</p>
		</div>
		{#if data.audioUrl}
			<audio controls preload="none" src={data.audioUrl} class="w-full" aria-label="Profile background audio preview"></audio>
		{/if}
		<p class="text-xs text-neutral-500">MP3, M4A, OGG, WAV or WebM · max 10 MB</p>
		<div class="flex flex-wrap gap-2">
			<UploadButton kind="audio" existingKey={data.profile.audioKey} label="Upload audio" />
			{#if data.profile.audioKey}
				<form method="POST" action="?/clearAudio"><Button type="submit" variant="ghost">Remove audio</Button></form>
			{/if}
		</div>
	</Card>

	<Card class="flex flex-col gap-4 p-5">
		<div>
			<h2 class="font-medium text-neutral-100">Custom cursor</h2>
			<p class="mt-1 text-sm text-neutral-400">A small PNG or WebP cursor for visitors on desktop. Touch devices keep their native cursor.</p>
		</div>
		{#if data.cursorUrl}<img src={data.cursorUrl} alt="Current custom cursor preview" class="size-12 object-contain" />{/if}
		<p class="text-xs text-neutral-500">PNG or WebP · max 256 KB</p>
		{#if data.plan.tier === 'premium'}
			<div class="flex flex-wrap gap-2">
				<UploadButton kind="cursor" existingKey={data.profile.cursorKey} label="Upload cursor" />
				{#if data.profile.cursorKey}
					<form method="POST" action="?/clearCursor"><Button type="submit" variant="ghost">Remove cursor</Button></form>
				{/if}
			</div>
		{:else}
			<a href="/upgrade" class="text-sm text-lime-300 hover:underline">Unlock cursor effects with Premium ↗</a>
		{/if}
	</Card>

	<a href="/{data.profile.slug}" class="text-sm text-lime-300 hover:underline">Preview my public page ↗</a>
</div>
