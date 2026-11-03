<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import LandingDemo from '#lib/components/LandingDemo.svelte';
	import PixelButterfly from '#lib/components/PixelButterfly.svelte';
	import Reveal from '#lib/components/Reveal.svelte';
	import { slide } from 'svelte/transition';

	type Stats = { profiles: number; guilds: number; members: number };

	// The page is prerendered, so the community numbers arrive from /api/stats
	// once it is running in the browser.
	let stats = $state<Stats | null>(null);

	onMount(() => {
		let cancelled = false;
		void (async () => {
			try {
				const res = await fetch('/api/stats');
				if (!res.ok) return;
				const next = (await res.json()) as Stats;
				if (!cancelled) stats = next;
			} catch {
				// The strip simply stays hidden when the counters are unavailable.
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	let scrollY = $state(0);
	const parallaxY = $derived(Math.min(scrollY * 0.12, 110));

	// The landing is a small playground: the headline cycles, you can type your
	// own name into the demo, and the primary button leans toward the cursor.
	const headlines = ['impossible to ignore.', 'one link, all of you on it.', 'unmistakably yours.'];

	let headlineIndex = $state(0);
	const headline = $derived(headlines[headlineIndex] ?? headlines[0] ?? '');
	let pageName = $state('');
	let magnetEl = $state<HTMLSpanElement | undefined>(undefined);

	// The closing section shows a fresh made-up name every couple of seconds.
	const NAME_ADJECTIVES = [
		'quiet',
		'soft',
		'late',
		'low',
		'lucky',
		'neon',
		'tiny',
		'wild',
		'velvet',
		'side',
		'sunset',
		'mellow'
	];
	const NAME_NOUNS = [
		'kai',
		'luna',
		'moth',
		'comet',
		'pixel',
		'fern',
		'echo',
		'opus',
		'bird',
		'static',
		'studio',
		'wave'
	];

	function randomHandle(): string {
		const adjective = NAME_ADJECTIVES[Math.floor(Math.random() * NAME_ADJECTIVES.length)] ?? 'soft';
		const noun = NAME_NOUNS[Math.floor(Math.random() * NAME_NOUNS.length)] ?? 'wave';
		return `${adjective}-${noun}`;
	}

	type SampleHandle = { id: number; name: string };

	let handleSeq = 0;

	// The first name is fixed so the prerendered HTML matches the first paint.
	let handles = $state<SampleHandle[]>([{ id: 0, name: 'quiet-wave' }]);
	const activeHandle = $derived(handles[handles.length - 1]?.id ?? 0);

	onMount(() => {
		const nextHandle = () => {
			handleSeq += 1;
			handles = [...handles.slice(-1), { id: handleSeq, name: randomHandle() }];
		};

		handles = [{ id: ++handleSeq, name: randomHandle() }];

		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const timer = setInterval(nextHandle, 2000);
		return () => clearInterval(timer);
	});

	onMount(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const timer = setInterval(() => {
			headlineIndex = (headlineIndex + 1) % headlines.length;
		}, 4200);
		return () => clearInterval(timer);
	});

	function moveMagnet(event: PointerEvent) {
		const el = magnetEl;
		if (!el || event.pointerType !== 'mouse') return;
		const rect = el.getBoundingClientRect();
		const x = (event.clientX - rect.left - rect.width / 2) / rect.width;
		const y = (event.clientY - rect.top - rect.height / 2) / rect.height;
		el.style.setProperty('--mag-x', `${(x * 12).toFixed(2)}px`);
		el.style.setProperty('--mag-y', `${(y * 8).toFixed(2)}px`);
	}

	function resetMagnet() {
		magnetEl?.style.removeProperty('--mag-x');
		magnetEl?.style.removeProperty('--mag-y');
	}

	let openFaq = $state<number | null>(null);

	function toggleFaq(index: number) {
		openFaq = openFaq === index ? null : index;
	}

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
			answer: 'Premium is Rp 30.000 a month: 30 days per payment, renewed by hand, with no automatic charge.'
		}
	];
	const creates = [
		{
			icon: '✦',
			title: 'Personal brand',
			copy: 'A page that looks designed, with your name, your colours and the things you actually care about.',
			tag: 'profile'
		},
		{
			icon: '◉',
			title: 'A circle',
			copy: 'Find and keep the people who get you, with a circle that starts from your own page.',
			tag: 'community'
		},
		{
			icon: '◇',
			title: 'Flex',
			copy: 'Badges, frames, wallpapers and layouts that say something without shouting.',
			tag: 'cosmetics'
		},
		{
			icon: '✳',
			title: 'Expression',
			copy: 'Backgrounds, textures, audio, a cursor and a layout builder, all in your own taste.',
			tag: 'customise'
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
	<PixelButterfly />
	<div class="relative grid items-center gap-12 py-10 sm:py-16 lg:grid-cols-[1.1fr_.9fr] lg:gap-16 lg:py-20">
		<div class="flex flex-col items-start gap-6">
			<Reveal>
				<p class="landing-eyebrow"><span class="status-dot"></span> YOUR SPACE. YOUR PEOPLE.</p>
			</Reveal>
			<Reveal delay={70}>
				<h1 class="max-w-3xl text-5xl font-semibold leading-[1.04] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
					Make your corner<br />
					<span class="landing-line">
						{#each headlines as line (line)}
							<span
								class="landing-gradient landing-line-text"
								class:is-active={line === headline}
								aria-hidden={line === headline ? undefined : 'true'}
							>{line}</span>
						{/each}
					</span>
				</h1>
			</Reveal>
			<Reveal delay={140}>
				<p class="max-w-xl text-base leading-8 text-neutral-400 sm:text-lg">
					Build a personal brand that actually looks like you, keep your circle close, and flex the things you love. All of it living on one link.
				</p>
			</Reveal>
			<Reveal delay={210}>
				<div class="flex flex-wrap items-center gap-3">
					<span class="landing-magnetic" bind:this={magnetEl}>
						<Button href="/login" onpointermove={moveMagnet} onpointerleave={resetMagnet}>Get started with Discord or Google</Button>
					</span>
					<Button href="/discover" variant="ghost">Find your circle <span aria-hidden="true">↗</span></Button>
				</div>
			</Reveal>
			<Reveal delay={300}>
				<label class="landing-claim">
					<span class="landing-claim-prefix">ovyn.me/</span>
					<input
						class="landing-claim-input"
						bind:value={pageName}
						maxlength="24"
						placeholder="your name"
						spellcheck="false"
						autocomplete="off"
						aria-label="Preview your page name"
					/>
					<span class="landing-claim-tag">preview</span>
				</label>
			</Reveal>
			<Reveal delay={360}>
				<div class="flex flex-wrap items-center gap-2">
					<span class="landing-pill"><em>01</em> personal brand</span>
					<span class="landing-pill"><em>02</em> circle</span>
					<span class="landing-pill"><em>03</em> flex</span>
					<span class="landing-pill"><em>04</em> expression</span>
				</div>
			</Reveal>
		</div>

		<Reveal delay={150} class="landing-profile-stage relative mx-auto w-full lg:max-w-none">
			<div class="landing-orbit landing-orbit--stage" style={`--parallax-y: ${parallaxY * 0.35}px`} aria-hidden="true"></div>
			<LandingDemo name={pageName} />
		</Reveal>
	</div>
</section>

<section class="brand-ribbon" aria-label="ovyn community">
	<span>ovyn</span><i></i><span>your identity</span><i></i><span>your circle</span><i></i><span>your internet</span><i></i><span>ovyn</span>
</section>

<section id="create" class="landing-section py-14 sm:py-20">
	<Reveal>
		<div class="max-w-2xl">
			<p class="landing-eyebrow">WHAT YOU CAN CREATE</p>
			<h2 class="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">One page. Everything you are.</h2>
			<p class="mt-3 text-sm leading-7 text-neutral-400">
				A personal brand that looks intentional, a circle that feels close, and enough flex to show what you love.
			</p>
		</div>
	</Reveal>
	<div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each creates as item, index (item.title)}
			<Reveal delay={index * 70}>
				<article class="create-card">
					<span class="create-glyph" aria-hidden="true">{item.icon}</span>
					<h3 class="mt-4 font-medium text-neutral-100">{item.title}</h3>
					<p class="mt-2 text-sm leading-6 text-neutral-400">{item.copy}</p>
					<p class="mt-4 font-mono text-[10px] uppercase tracking-wider text-neutral-500">{item.tag}</p>
				</article>
			</Reveal>
		{/each}
	</div>
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

{#if stats}
	<Reveal stagger>
		<section class="community-strip flex flex-wrap items-center justify-center gap-x-10 gap-y-5 py-12 text-center" aria-label="ovyn community stats">
			<div data-reveal-item style="--reveal-order: 0"><strong>{stats.profiles}</strong><span>identities</span></div>
			<div data-reveal-item style="--reveal-order: 1"><strong>{stats.guilds}</strong><span>circles</span></div>
			<div data-reveal-item style="--reveal-order: 2"><strong>{stats.members}</strong><span>members</span></div>
		</section>
	</Reveal>
{/if}

<section id="plans" class="landing-section py-16 sm:py-24">
	<Reveal>
		<div class="mx-auto mb-10 max-w-xl text-center">
			<p class="landing-eyebrow justify-center">SIMPLE PLANS, NO SURPRISES</p>
			<h2 class="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Start free. Add more when you need it.</h2>
			<p class="mt-3 text-sm leading-7 text-neutral-400">A great page starts free. Add Premium for Rp 30.000 a month when you want the full creative toolkit.</p>
		</div>
	</Reveal>
	<div class="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
		<Reveal class="h-full">
			<article class="plan-card h-full">
				<div class="flex items-center justify-between gap-3"><h3>Free</h3><span class="plan-mark">ALWAYS FREE</span></div>
				<p class="plan-price">Rp 0 <span>forever</span></p>
				<ul>{#each freeFeatures as feature (feature)}<li><span aria-hidden="true">✓</span>{feature}</li>{/each}</ul>
				<Button href="/login" variant="secondary" class="mt-7 w-full">Create your page</Button>
			</article>
		</Reveal>
		<Reveal delay={100} class="h-full">
			<article class="plan-card plan-card--premium h-full">
				<div class="flex items-center justify-between gap-3"><h3>Premium</h3><span class="premium-mark">30 DAYS</span></div>
				<p class="plan-price">Rp 30.000 <span>per month</span></p>
				<p class="mb-5 text-sm text-neutral-400">Everything in Free, plus room to make your profile unmistakably yours.</p>
				<ul>{#each premiumFeatures as feature (feature)}<li><span aria-hidden="true">✦</span>{feature}</li>{/each}</ul>
				<p class="plan-rollout-note">Layouts, the Premium badge and cursor effects are live now. Fonts, widgets, SEO, typewriter text, aliases and extra preferences are in development.</p>
				<Button href="/upgrade" class="mt-7 w-full">Explore Premium</Button>
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
				<div class="faq-item px-5 py-4 {openFaq === index ? 'is-open' : ''}">
					<button
						type="button"
						class="faq-summary"
						aria-expanded={openFaq === index}
						aria-controls={`faq-panel-${index}`}
						onclick={() => toggleFaq(index)}
					>
						<span class="font-medium text-neutral-100">{item.question}</span>
						<span class="faq-toggle" aria-hidden="true">+</span>
					</button>
					{#if openFaq === index}
						<div id={`faq-panel-${index}`} class="faq-panel" transition:slide={{ duration: 280 }}>
							<p class="max-w-2xl text-sm leading-6 text-neutral-400">{item.answer}</p>
						</div>
					{/if}
				</div>
			</Reveal>
		{/each}
	</div>
</section>

<Reveal stagger>
	<section class="landing-end relative overflow-hidden py-14 text-center sm:py-20">
		<div class="landing-end-ring" aria-hidden="true"></div>
		<div class="relative mx-auto flex max-w-2xl flex-col items-center gap-5">
			<p class="landing-eyebrow justify-center" data-reveal-item style="--reveal-order: 0">YOUR TAB IS OPEN</p>
			<h2 class="text-4xl font-semibold tracking-tight sm:text-5xl" data-reveal-item style="--reveal-order: 1">Make your mark.</h2>
			<p class="max-w-xl text-neutral-400" data-reveal-item style="--reveal-order: 2">Claim a name, shape your space, and let your people find you.</p>
			<p class="landing-end-link" data-reveal-item style="--reveal-order: 3">
				<span>ovyn.me/</span>
				<span class="landing-end-name">
					{#each handles as item (item.id)}
						<span class:is-active={item.id === activeHandle} aria-hidden={item.id === activeHandle ? undefined : 'true'}>{item.name}</span>
					{/each}
				</span>
			</p>
			<div class="flex flex-wrap justify-center gap-3" data-reveal-item style="--reveal-order: 4">
				<Button href="/login">Continue with Discord or Google</Button>
				<Button href="/discover" variant="ghost">Meet the community</Button>
			</div>
		</div>
	</section>
</Reveal>
