<script lang="ts">
	import type { PageData } from './$types';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Reveal from '#lib/components/Reveal.svelte';

	let { data }: { data: PageData } = $props();
	let scrollY = $state(0);
	const parallaxY = $derived(Math.min(scrollY * 0.12, 110));

	const freeFeatures = [
		'Background effects',
		'Profile analytics',
		'Username effects',
		'Color customization',
		'Social links'
	];
	const premiumFeatures = [
		'Everything in Free',
		'Profile layouts and layout customization',
		'Exclusive badge and profile preferences',
		'Text font and typewriter description',
		'Cursor effects and profile widgets',
		'Metadata, SEO and page aliases'
	];
	const faqs = [
		{
			question: 'What is ovyn?',
			answer: 'A personal page for your online identity, built to show your style and help your people find you.'
		},
		{
			question: 'How do I sign in?',
			answer: 'Use Discord or Google. Your ovyn username, display name, bio and public page stay yours to customize.'
		},
		{
			question: 'Can I start for free?',
			answer: 'Yes. Free includes the essentials for a distinctive profile, social links and profile analytics.'
		},
		{
			question: 'What does Premium cost?',
			answer: 'Premium is a one-time payment of Rp 100.000 for lifetime access. There is no subscription renewal.'
		}
	];
</script>

<svelte:window bind:scrollY />

<svelte:head>
	<title>ovyn - your space on the internet</title>
	<meta name="description" content="A personal corner of the internet to show your style, share your links and find your people." />
</svelte:head>

<section class="landing-hero relative isolate overflow-hidden">
	<div class="landing-orbit landing-orbit--one" style={`--parallax-y: ${parallaxY}px`} aria-hidden="true"></div>
	<div class="landing-orbit landing-orbit--two" style={`--parallax-y: ${-parallaxY * 0.55}px`} aria-hidden="true"></div>
	<div class="relative grid items-center gap-12 py-10 sm:py-16 lg:grid-cols-[1.1fr_.9fr] lg:gap-16 lg:py-20">
		<div class="flex flex-col items-start gap-6">
			<Reveal>
				<p class="landing-eyebrow"><span class="status-dot"></span> YOUR SPACE. YOUR PEOPLE.</p>
			</Reveal>
			<Reveal delay={70}>
				<h1 class="max-w-3xl text-5xl font-semibold leading-[1.04] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
					Make your corner<br />
					<span class="landing-gradient">impossible to ignore.</span>
				</h1>
			</Reveal>
			<Reveal delay={140}>
				<p class="max-w-xl text-base leading-8 text-neutral-400 sm:text-lg">
					Your profile is more than a link. Build a space that feels like you, show off what you love, and bring your circle closer.
				</p>
			</Reveal>
			<Reveal delay={210}>
				<div class="flex flex-wrap items-center gap-3">
					{#if data.user}
						<Button href="/account">Open your space</Button>
					{:else}
						<Button href="/login">Get started with Discord or Google</Button>
					{/if}
					<Button href="/discover" variant="ghost">Find your circle <span aria-hidden="true">↗</span></Button>
				</div>
			</Reveal>
			<Reveal delay={280}>
				<div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-neutral-500">
					<span><span class="text-lime-300">01</span> claim a username</span>
					<span><span class="text-pop-pink">02</span> make it yours</span>
					<span><span class="text-pop-blue">03</span> share it everywhere</span>
				</div>
			</Reveal>
		</div>

		<Reveal delay={150} class="landing-profile-stage relative mx-auto w-full max-w-lg">
			<div class="landing-profile-orbit" style={`--parallax-y: ${parallaxY * 0.35}px`} aria-hidden="true"></div>
			<div class="landing-profile-preview relative">
				<div class="flex items-center justify-between gap-4">
					<p class="landing-eyebrow">ovyn / your space</p>
					<span class="profile-live"><span class="status-dot"></span> YOUR PAGE</span>
				</div>
				<div class="mt-10 flex items-center gap-5">
					<div class="relative">
						<Avatar name="your name" size="xl" />
						<span class="avatar-orbit" aria-hidden="true"></span>
					</div>
					<div class="min-w-0">
						<p class="truncate text-2xl font-semibold">your name here</p>
						<p class="mt-1 text-sm text-neutral-500">@your-corner</p>
					</div>
				</div>
				<p class="mt-7 max-w-sm text-sm leading-7 text-neutral-400">A little bit of your world, the things you love, and every place your people can find you.</p>
				<div class="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm text-neutral-300">
					<a href="/discover">Your people <span class="text-pop-pink">↗</span></a>
					<a href="/shop">Your style <span class="text-pop-blue">↗</span></a>
					<a href="/login">Your link <span class="text-lime-300">↗</span></a>
				</div>
			</div>
			<span class="orbit-caption orbit-caption--one">YOUR VIBE, EVERYWHERE</span>
			<span class="orbit-caption orbit-caption--two">MAKE YOUR MARK</span>
		</Reveal>
	</div>
</section>

<section class="brand-ribbon" aria-label="ovyn community">
	<span>ovyn</span><i></i><span>your identity</span><i></i><span>your circle</span><i></i><span>your internet</span><i></i><span>ovyn</span>
</section>

<section id="features" class="landing-section grid gap-8 py-16 sm:py-24 md:grid-cols-[.75fr_1.25fr]">
	<Reveal>
		<div class="max-w-sm">
			<p class="landing-eyebrow">A HOME THAT FEELS LIKE YOU</p>
			<h2 class="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Your identity,<br />with room to grow.</h2>
			<p class="mt-4 text-sm leading-7 text-neutral-400">One simple link that feels like your own little corner of the internet.</p>
		</div>
	</Reveal>
	<div class="feature-list">
		<Reveal delay={50}>
			<article class="feature-row"><span class="feature-index">01</span><div><h3>Show your style</h3><p>Backgrounds, color, profile effects and little details that make your page instantly yours.</p></div><span class="feature-symbol" aria-hidden="true">✳</span></article>
		</Reveal>
		<Reveal delay={110}>
			<article class="feature-row"><span class="feature-index">02</span><div><h3>Bring your links together</h3><p>Your socials, projects and favorite places, all collected in one shareable profile.</p></div><span class="feature-symbol feature-symbol--pink" aria-hidden="true">↗</span></article>
		</Reveal>
		<Reveal delay={170}>
			<article class="feature-row"><span class="feature-index">03</span><div><h3>Find your people</h3><p>Discover communities and circles that make your corner feel a little less alone.</p></div><span class="feature-symbol feature-symbol--blue" aria-hidden="true">◌</span></article>
		</Reveal>
	</div>
</section>

{#if data.stats}
	<Reveal>
		<section class="community-strip flex flex-wrap items-center justify-center gap-x-10 gap-y-5 py-12 text-center" aria-label="ovyn community stats">
			<div><strong>{data.stats.profiles}</strong><span>identities</span></div>
			<div><strong>{data.stats.guilds}</strong><span>circles</span></div>
			<div><strong>{data.stats.members}</strong><span>members</span></div>
		</section>
	</Reveal>
{/if}

<section id="plans" class="landing-section py-16 sm:py-24">
	<Reveal>
		<div class="mx-auto mb-10 max-w-xl text-center">
			<p class="landing-eyebrow justify-center">SIMPLE PLANS, NO SURPRISES</p>
			<h2 class="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Start free. Stay forever.</h2>
			<p class="mt-3 text-sm leading-7 text-neutral-400">A great page starts free. Upgrade once when you want the full creative toolkit.</p>
		</div>
	</Reveal>
	<div class="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
		<Reveal class="h-full">
			<article class="plan-card h-full">
				<div class="flex items-center justify-between gap-3"><h3>Free</h3><span class="plan-mark">ALWAYS FREE</span></div>
				<p class="plan-price">Rp 0 <span>forever</span></p>
				<ul>{#each freeFeatures as feature (feature)}<li><span aria-hidden="true">✓</span>{feature}</li>{/each}</ul>
				<Button href={data.user ? '/account' : '/login'} variant="secondary" class="mt-7 w-full">{data.user ? 'Your account' : 'Create your page'}</Button>
			</article>
		</Reveal>
		<Reveal delay={100} class="h-full">
			<article class="plan-card plan-card--premium h-full">
				<div class="flex items-center justify-between gap-3"><h3>Premium</h3><span class="premium-mark">ONE PAYMENT</span></div>
				<p class="plan-price">Rp 100.000 <span>lifetime</span></p>
				<p class="mb-5 text-sm text-neutral-400">Everything in Free, plus room to make your profile unmistakably yours.</p>
				<ul>{#each premiumFeatures as feature (feature)}<li><span aria-hidden="true">✦</span>{feature}</li>{/each}</ul>
				<p class="plan-rollout-note">Layouts, the Premium badge and cursor effects are live now. Fonts, widgets, SEO, typewriter text, aliases and extra preferences are in development.</p>
				<Button href={data.user ? '/upgrade' : '/login'} class="mt-7 w-full">{data.user ? 'Explore Premium' : 'Sign in to explore Premium'}</Button>
			</article>
		</Reveal>
	</div>
</section>

<section id="faq" class="landing-section grid gap-8 py-16 sm:py-24 md:grid-cols-[.75fr_1.25fr]">
	<Reveal>
		<div class="max-w-sm">
			<p class="landing-eyebrow">GOOD TO KNOW</p>
			<h2 class="mt-4 text-3xl font-semibold tracking-tight">A few quick things.</h2>
			<p class="mt-3 text-sm leading-7 text-neutral-400">The short version, before you make this place yours.</p>
		</div>
	</Reveal>
	<div class="faq-list">
		{#each faqs as item, index (item.question)}
			<Reveal delay={index * 60}>
				<details class="faq-item rounded-2xl px-5 py-4">
					<summary class="faq-summary flex cursor-pointer items-center justify-between gap-4 font-medium text-neutral-100">{item.question}<span class="faq-toggle" aria-hidden="true">+</span></summary>
					<p class="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">{item.answer}</p>
				</details>
			</Reveal>
		{/each}
	</div>
</section>

<Reveal>
	<section class="landing-end relative overflow-hidden py-14 text-center sm:py-20">
		<div class="landing-end-ring" aria-hidden="true"></div>
		<div class="relative mx-auto flex max-w-2xl flex-col items-center gap-5">
			<p class="landing-eyebrow justify-center">YOUR TAB IS OPEN</p>
			<h2 class="text-4xl font-semibold tracking-tight sm:text-5xl">Make your mark.</h2>
			<p class="max-w-xl text-neutral-400">Claim a name, shape your space, and let your people find you.</p>
			<div class="flex flex-wrap justify-center gap-3">
				{#if data.user}<Button href="/account">Open your space</Button>{:else}<Button href="/login">Continue with Discord or Google</Button>{/if}
				<Button href="/discover" variant="ghost">Meet the community</Button>
			</div>
		</div>
	</section>
</Reveal>
