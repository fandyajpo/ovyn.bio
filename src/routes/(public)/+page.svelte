<script lang="ts">
	import type { PageData } from './$types';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import ProfileCard from '#lib/components/ProfileCard.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>OVYN — Your identity. Your circle.</title>
	<meta name="description" content="Make a corner of the internet that feels like you. Find your people on OVYN." />
</svelte:head>

<section class="hero-stage relative isolate overflow-hidden rounded-[2rem] border border-white/10 px-5 py-10 sm:px-10 sm:py-14 lg:px-14">
	<div class="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full border border-lime-300/10 sm:size-96" aria-hidden="true"></div>
	<div class="pointer-events-none absolute right-20 top-20 size-3 rounded-full bg-pop-pink shadow-[0_0_36px_12px_rgba(255,120,168,0.18)]" aria-hidden="true"></div>
	<div class="relative grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
		<div class="flex flex-col items-start gap-6">
			<div class="flex flex-wrap items-center gap-3">
				<span class="sticker">DIGITAL IDENTITY CLUB</span>
				<span class="sticker sticker--pink">YOUR PEOPLE, TOO</span>
			</div>
			<div>
				<p class="mb-3 font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">Your identity. Your circle.</p>
				<h1 class="max-w-3xl font-[family-name:var(--font-display)] text-5xl font-bold leading-[0.96] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
					Your corner<br />of the internet.<br />
					<span class="text-lime-300">Your people.</span>
				</h1>
			</div>
			<p class="max-w-xl text-base leading-7 text-neutral-400 sm:text-lg">
				Make a profile that feels like you, find a guild that gets you, and collect little details that make your page yours.
			</p>
			<div class="flex flex-wrap gap-3">
				{#if data.user}
					<Button href="/dashboard">Open your space</Button>
					<Button href="/discover" variant="secondary">Find your circle</Button>
				{:else}
					<Button href="/login">Claim your corner</Button>
					<Button href="/discover" variant="secondary">Explore guilds</Button>
				{/if}
			</div>
			<p class="font-mono text-xs text-neutral-600">No template energy. Just you, with better framing.</p>
		</div>

		<div class="relative mx-auto min-h-[330px] w-full max-w-lg sm:min-h-[390px]">
			<div class="pointer-events-none absolute left-1/2 top-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-neutral-700/70 sm:size-80" aria-hidden="true"></div>
			<div class="hero-doodle absolute left-1 top-2 z-20"><span class="sticker sticker--blue">ONLINE, SORT OF</span></div>
			<div class="collage-card collage-card--pink absolute right-0 top-12 z-10 w-[72%] rotate-3 rounded-[1.6rem] bg-[#1a1c18] p-5 sm:right-2 sm:top-10">
				<div class="flex items-center justify-between gap-3">
					<span class="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">OVYN / ID</span>
					<span class="sticker sticker--pink">YOUR PAGE</span>
				</div>
				{#if data.featuredProfiles.length > 0}
					{@const featured = data.featuredProfiles[0]!}
					<div class="mt-7 flex items-center gap-4">
						<Avatar name={featured.profile.displayName || featured.profile.slug} src={featured.avatarUrl} size="lg" />
						<div class="min-w-0">
							<p class="truncate font-[family-name:var(--font-display)] text-xl font-bold">{featured.profile.displayName || featured.profile.slug}</p>
							<p class="font-mono text-sm text-neutral-500">@{featured.profile.slug}</p>
						</div>
					</div>
					{#if featured.profile.bio}<p class="mt-5 line-clamp-2 text-sm text-neutral-400">{featured.profile.bio}</p>{/if}
					<a href="/{featured.profile.slug}" class="mt-6 inline-flex text-xs font-bold uppercase tracking-widest text-lime-300 hover:text-lime-200">Meet the community <span aria-hidden="true" class="ml-2">↗</span></a>
				{:else}
					<div class="mt-7 flex items-center gap-4">
						<div class="grid size-16 place-items-center rounded-2xl border border-dashed border-neutral-600 bg-neutral-800/70 font-[family-name:var(--font-display)] text-2xl font-bold text-lime-300">U</div>
						<div><p class="font-[family-name:var(--font-display)] text-xl font-bold">your name here</p><p class="font-mono text-sm text-neutral-500">@your-corner</p></div>
					</div>
					<p class="mt-5 text-sm text-neutral-400">A profile, but with actual personality.</p>
					<a href="/login" class="mt-6 inline-flex text-xs font-bold uppercase tracking-widest text-lime-300">Make yours <span aria-hidden="true" class="ml-2">↗</span></a>
				{/if}
			</div>
			<div class="collage-card collage-card--blue absolute bottom-6 left-0 z-20 w-[66%] -rotate-2 rounded-[1.4rem] bg-[#151a1c] p-4 sm:bottom-8 sm:left-3">
				<div class="flex items-center justify-between gap-3">
					<span class="sticker sticker--blue">GUILD ENERGY</span>
					<span class="font-mono text-xs text-neutral-500">01 / 01</span>
				</div>
				<p class="mt-4 font-[family-name:var(--font-display)] text-2xl font-bold">Find your<br /><span class="text-pop-blue">kind of people.</span></p>
			</div>
			<div class="absolute bottom-2 right-8 z-30 rotate-6 sm:bottom-4"><span class="sticker sticker--lilac">MADE TO BE YOURS</span></div>
		</div>
	</div>
</section>

<section class="grid gap-4 py-12 sm:grid-cols-3 sm:py-16">
	<a href={data.user ? '/settings/profile' : '/login'} class="collage-card collage-card--pink group rounded-[1.6rem] bg-[#20191c] p-6 sm:p-7">
		<div class="flex items-center justify-between"><span class="font-mono text-xs text-neutral-500">01 / IDENTITY</span><span class="sticker sticker--pink">MAKE IT YOU</span></div>
		<h2 class="mt-8 font-[family-name:var(--font-display)] text-2xl font-bold">A page with<br />your fingerprints.</h2>
		<p class="mt-3 text-sm leading-6 text-neutral-400">Discord-synced identity, a wallpaper, and cosmetics that feel like your own corner.</p>
	</a>
	<a href="/discover" class="collage-card collage-card--blue group rounded-[1.6rem] bg-[#151d20] p-6 sm:mt-5 sm:p-7">
		<div class="flex items-center justify-between"><span class="font-mono text-xs text-neutral-500">02 / COMMUNITY</span><span class="sticker sticker--blue">FIND YOUR CREW</span></div>
		<h2 class="mt-8 font-[family-name:var(--font-display)] text-2xl font-bold">Your people<br />are out there.</h2>
		<p class="mt-3 text-sm leading-6 text-neutral-400">Browse guilds, meet the members, and pick one circle that actually fits.</p>
	</a>
	<a href="/shop" class="collage-card group rounded-[1.6rem] bg-[#1b1d17] p-6 sm:rotate-1 sm:p-7">
		<div class="flex items-center justify-between"><span class="font-mono text-xs text-neutral-500">03 / EXPRESSION</span><span class="sticker">LITTLE FLEX</span></div>
		<h2 class="mt-8 font-[family-name:var(--font-display)] text-2xl font-bold">Details matter.<br />So does the vibe.</h2>
		<p class="mt-3 text-sm leading-6 text-neutral-400">Frames, wallpapers, and badges. Collect them, style them, make the page yours.</p>
	</a>
</section>

{#if data.featuredProfiles.length > 0}
	<section class="flex flex-col gap-5 py-8 sm:py-12">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<span class="sticker sticker--lilac">COMMUNITY SPOTLIGHT</span>
				<h2 class="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">People to know.</h2>
			</div>
			<a href="/discover" class="font-mono text-xs uppercase tracking-widest text-neutral-400 transition-colors hover:text-lime-300">More out there <span aria-hidden="true">↗</span></a>
		</div>
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.featuredProfiles as item, index (item.profile.userId)}
				<div class={index === 1 ? 'sm:mt-6' : index === 2 ? 'sm:-mt-2' : ''}>
					<ProfileCard
						slug={item.profile.slug}
						displayName={item.profile.displayName}
						bio={item.profile.bio}
						avatarUrl={item.avatarUrl}
						createdAt={item.profile.createdAt}
					/>
				</div>
			{/each}
		</div>
	</section>
{/if}

{#if data.stats}
	<section class="flex flex-wrap justify-center gap-3 py-10 text-center">
		<span class="sticker sticker--dark">{data.stats.profiles} identities</span>
		<span class="sticker sticker--dark">{data.stats.guilds} guilds</span>
		<span class="sticker sticker--dark">{data.stats.members} members</span>
	</section>
{/if}
