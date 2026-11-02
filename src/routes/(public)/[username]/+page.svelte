<script lang="ts">
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import ProfileBadge from '#lib/components/ProfileBadge.svelte';
	import { formatDate } from '#lib/utils';

	let { data } = $props();

	const p = $derived.by(() => data.profile);
	// The OVYN display name wins; Discord identity is only a fallback.
	const displayName = $derived.by(() => {
		const profile = data.profile;
		return profile.displayName || data.discord?.globalName || data.discord?.username || profile.slug;
	});
	const bannerIsVideo = $derived(/\.(mp4|webm)$/i.test(p.bannerKey ?? ''));
	const bannerVideoType = $derived(p.bannerKey?.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4');
</script>

<svelte:head>
	<title>{displayName} (@{p.slug}) — OVYN</title>
</svelte:head>

{#if data.private}
	<div class="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center text-neutral-400">
		<span class="sticker sticker--pink">PRIVATE CORNER</span>
		<p>This profile is private.</p>
	</div>
{:else}
	<article class="profile-sheet relative isolate mx-auto flex max-w-2xl flex-col gap-6 overflow-hidden rounded-[2rem] border border-white/10 bg-neutral-950/75 p-4 sm:p-7">
		<div class="pointer-events-none absolute right-5 top-5 z-10 rotate-3" aria-hidden="true"><span class="sticker sticker--lilac">YOUR SPACE</span></div>
		{#if data.cosmetics?.wallpaperUrl}
			<img
				src={data.cosmetics.wallpaperUrl}
				alt=""
				class="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-20"
			/>
		{/if}

		{#if data.bannerUrl}
			{#if bannerIsVideo}
				<video autoplay loop muted playsinline preload="metadata" aria-hidden="true" tabindex="-1" class="h-40 w-full rounded-2xl border border-white/10 object-cover">
					<source src={data.bannerUrl} type={bannerVideoType} />
				</video>
			{:else}
				<img src={data.bannerUrl} alt="" class="h-40 w-full rounded-2xl border border-white/10 object-cover" />
			{/if}
		{:else if !data.cosmetics?.wallpaperUrl}
			<div class="profile-banner-doodle relative h-28 w-full overflow-hidden rounded-2xl border border-white/10">
				<span class="absolute -right-4 -top-8 size-32 rounded-full border border-lime-300/20"></span>
				<span class="absolute bottom-3 left-4 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">made of you / ovyn</span>
			</div>
		{:else}
			<div class="h-8"></div>
		{/if}

		<div class="flex items-start gap-4">
			<div class="relative">
				<Avatar name={displayName} src={data.avatarUrl} size="xl" />
				{#if data.cosmetics?.frameUrl}
					<img
						src={data.cosmetics.frameUrl}
						alt="Avatar frame"
						class="pointer-events-none absolute -inset-2 size-[calc(100%+16px)] object-contain"
					/>
				{/if}
			</div>
			<div class="min-w-0">
				<h1 class="flex items-center gap-2 truncate font-[family-name:var(--font-display)] text-2xl font-bold">
					{displayName}
					{#if data.cosmetics?.badgeUrl}
						<ProfileBadge label="OVYN profile badge" src={data.cosmetics.badgeUrl} />
					{/if}
				</h1>
				<p class="mt-1 font-mono text-sm text-lime-300">@{p.slug}</p>
				{#if data.discord}
					<p class="mt-2 inline-flex"><span class="sticker sticker--blue">DISCORD / {data.discord.username}</span></p>
				{/if}
			</div>
		</div>

		{#if p.bio}
			<p class="profile-bio collage-card collage-card--blue rounded-2xl bg-[#151a1c]/90 p-4 text-base leading-7 text-neutral-200">{p.bio}</p>
		{/if}

		{#if data.guild}
			<Card class="collage-card rounded-2xl bg-[#1b1d19]/90 p-4">
				<p class="mb-2 inline-flex"><span class="sticker sticker--lilac">YOUR CIRCLE</span></p>
				<p class="font-mono text-xs text-neutral-500 uppercase tracking-wider">Current guild</p>
				<a href="/guild/{data.guild.slug}" class="mt-1 text-lg font-semibold text-lime-300 hover:underline">
					{data.guild.name}
				</a>
			</Card>
		{:else}
			<p class="text-sm text-neutral-500">Not part of a guild yet.</p>
		{/if}

		<p class="font-mono text-xs uppercase tracking-widest text-neutral-600">Member since {formatDate(p.createdAt)}</p>
		{#if data.viewerTracked}
			<p class="rounded-full border border-white/10 bg-neutral-900/70 px-3 py-2 text-xs text-neutral-500">Signed-in visits may appear in this profile's analytics.</p>
		{/if}
	</article>
{/if}
