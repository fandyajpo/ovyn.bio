<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import '../app.css';
	import Nav from '#lib/components/Nav.svelte';
	import PageHelp from '#lib/components/PageHelp.svelte';
	import Reveal from '#lib/components/Reveal.svelte';
	import SnailMascot from '#lib/components/SnailMascot.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import Toasts from '#lib/components/ui/Toasts.svelte';
	import { startThemeSync, themeState } from '#lib/theme.svelte.ts';
	import LiquidBackground from '#lib/components/LiquidBackground.svelte';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { createQueryClient } from '#lib/queries/client';

	let { children }: { children: any } = $props();

	// Created once per browser tab and once per server render, so cached server
	// state can never be shared between users.
	const queryClient = createQueryClient();

	// One place keeps the theme in step with every other open tab.
	onMount(() => {
		startThemeSync();
	});
	const isLanding = $derived(page.url.pathname === '/');
	const isProfilePage = $derived(page.route.id?.endsWith('/[username]') ?? false);
	const isWorkspacePage = $derived(page.route.id?.includes('(workspace)') ?? false);
	const isAdminPage = $derived(page.route.id?.includes('(app)/admin') ?? false);
	const isOnboarding = $derived(page.route.id?.includes('(app)/onboarding') ?? false);
	// The liquid-metal backdrop is the site background: every page except public
	// profiles, which keep their user-styled backdrops.
	const isLiquidPage = $derived(!isProfilePage);
	const showsSiteChrome = $derived(!isProfilePage && !isWorkspacePage && !isAdminPage && !isOnboarding);
</script>

<QueryClientProvider client={queryClient}>
	<div class="app-frame" data-landing={isLanding ? 'true' : 'false'} data-liquid={isLiquidPage ? 'true' : 'false'} data-profile-page={isProfilePage ? 'true' : 'false'} data-workspace-page={isWorkspacePage ? 'true' : 'false'} data-admin-page={isAdminPage ? 'true' : 'false'} data-onboarding={isOnboarding ? 'true' : 'false'}>
		<a class="skip-link" href="#main-content">Skip to content</a>
		<!-- The liquid-metal canvas is the background of the whole site except
			public profiles, which keep their user-styled backdrops. Dark mode:
			black base, violet ribbon, copper-gold highlights. Light mode: bone
			base, blue ribbon, orange highlights. Motion runs slow and dim so it
			reads as an ambient surface, not a showpiece. -->
		{#if isLiquidPage}
			<LiquidBackground
				baseColor={themeState.value === 'light' ? '#ebe7dc' : '#000000'}
				colorA={themeState.value === 'light' ? '#5b8af5' : '#2b0a4d'}
				colorB={themeState.value === 'light' ? '#e8853c' : '#c98a4a'}
				rimColor={themeState.value === 'light' ? '#f6c9a8' : '#f2b8d9'}
				speed={0.06}
				intensity={themeState.value === 'light' ? 0.85 : 1}
			/>
		{/if}
		{#if showsSiteChrome}<Nav />{/if}

		<div class="app-workspace">
			<main id="main-content" class={['page-content', isProfilePage && 'profile-page-content']} tabindex="-1">
				<div class={['page-container', isProfilePage && 'profile-page-container']}>
					{@render children()}
				</div>
			</main>
		</div>

		{#if showsSiteChrome}
			<footer class="app-footer border-t border-neutral-800/70">
				<div class="app-footer-inner mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:flex-row sm:items-end sm:justify-between">
					<Reveal>
						<div class="flex flex-col items-start gap-4">
							<div class="flex items-center gap-3">
								<SnailMascot variant="footer" size={64} />
								<span class="sticker sticker--dark">ovyn / internet personhood</span>
							</div>
							<p class="max-w-sm font-[family-name:var(--font-display)] text-xl font-semibold text-neutral-200">Your identity, out in the world.<br /><span class="text-neutral-500">Your people, one link away.</span></p>
							<nav aria-label="Footer" class="flex flex-wrap gap-4 font-mono text-xs text-neutral-500">
								<a href="/discover" class="hover:text-lime-300">Discover</a>
								<a href="/shop" class="hover:text-lime-300">Shop</a>
								<a href="/#plans" class="hover:text-lime-300">Plans</a>
								<a href="/terms" class="hover:text-lime-300">Terms</a>
								<a href="/privacy" class="hover:text-lime-300">Privacy</a>
								<a href="/login" class="hover:text-lime-300">Your account</a>
							</nav>
							<p class="font-mono text-[10px] tracking-widest text-neutral-700">ovyn. your identity. your circle.</p>
						</div>
					</Reveal>
					<Reveal delay={90}>
						<div class="flex items-center gap-3 text-sm text-neutral-500"><span>Appearance</span><ThemeToggle /></div>
					</Reveal>
				</div>
			</footer>
		{/if}
	</div>

	<PageHelp />
	<Toasts />
</QueryClientProvider>

<svelte:head>
	<meta property="og:site_name" content="ovyn" />
	<meta name="twitter:card" content="summary" />
</svelte:head>

<style>
	.app-frame {
		min-height: 100svh;
		display: flex;
		flex: 1;
		flex-direction: column;
	}

	.app-workspace {
		min-width: 0;
		flex: 1;
	}

	.page-content {
		width: 100%;
		min-width: 0;
		padding: 1.5rem max(1rem, env(safe-area-inset-right)) calc(2rem + env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
	}

	.page-content.profile-page-content {
		padding: 0;
	}

	.page-container {
		width: 100%;
		max-width: 80rem;
		margin-inline: auto;
	}

	.page-container.profile-page-container {
		max-width: none;
		margin: 0;
	}

	.app-frame[data-landing='true'] .page-container {
		max-width: 80rem;
	}

	.app-frame[data-landing='true'] .page-content {
		padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));
	}

	.app-frame[data-landing='true'] .app-footer {
		margin-top: 0;
	}

	.app-footer {
		padding-bottom: env(safe-area-inset-bottom);
	}

	.app-footer-inner {
		width: 100%;
		max-width: 80rem;
		padding-left: max(1rem, env(safe-area-inset-left));
		padding-right: max(1rem, env(safe-area-inset-right));
	}

	:global(.site-header) {
		padding-top: env(safe-area-inset-top);
	}

	:global(.app-frame .site-header-inner) {
		width: 100%;
		max-width: 80rem;
		margin-inline: auto;
		padding-left: max(1rem, env(safe-area-inset-left));
		padding-right: max(1rem, env(safe-area-inset-right));
	}

	:global(.app-frame[data-landing='true'] .site-header-inner) {
		max-width: 80rem;
	}

	.skip-link {
		position: fixed;
		z-index: 100;
		top: calc(0.75rem + env(safe-area-inset-top));
		left: calc(0.75rem + env(safe-area-inset-left));
		transform: translateY(-180%);
		border-radius: 0.75rem;
		background: var(--color-accent);
		padding: 0.75rem 1rem;
		color: var(--color-on-accent);
		font-weight: 700;
	}

	.skip-link:focus {
		transform: translateY(0);
	}

	@media (min-width: 40rem) {
		.page-content {
			padding-block: 1.5rem;
			padding-inline: max(1.25rem, env(safe-area-inset-left)) max(1.25rem, env(safe-area-inset-right));
		}
	}

	/* Phones keep room below the content for the fixed help bubble and the
	   floating menu pill, so the last buttons never sit underneath them. */
	@media (max-width: 39.999rem) {
		.page-content {
			padding-bottom: calc(4.5rem + env(safe-area-inset-bottom));
		}
	}
</style>
