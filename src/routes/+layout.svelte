<script lang="ts">
	import { page } from '$app/state';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import type { LayoutData } from './$types';
	import '../app.css';
	import Nav from '#lib/components/Nav.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import Toasts from '#lib/components/ui/Toasts.svelte';

	let { data, children }: { data: LayoutData; children: any } = $props();
	const isLanding = $derived(page.url.pathname === '/');
	const isProfilePage = $derived(page.route.id?.endsWith('/[username]') ?? false);
	const isWorkspacePage = $derived(page.route.id?.includes('(workspace)') ?? false);
	const isAdminPage = $derived(page.route.id?.includes('(app)/admin') ?? false);
	const showsSiteChrome = $derived(!isProfilePage && !isWorkspacePage && !isAdminPage);

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: 1, refetchOnWindowFocus: false }
		}
	});
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
</svelte:head>

<QueryClientProvider client={queryClient}>
	<div class="app-frame" data-landing={isLanding ? 'true' : 'false'} data-profile-page={isProfilePage ? 'true' : 'false'} data-workspace-page={isWorkspacePage ? 'true' : 'false'} data-admin-page={isAdminPage ? 'true' : 'false'}>
		<a class="skip-link" href="#main-content">Skip to content</a>
		{#if showsSiteChrome}<Nav user={data.user} />{/if}

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
					<div class="flex flex-col items-start gap-4">
						<span class="sticker sticker--dark">ovyn / internet personhood</span>
						<p class="max-w-sm font-[family-name:var(--font-display)] text-xl font-semibold text-neutral-200">Your identity, out in the world.<br /><span class="text-neutral-500">Your people, one link away.</span></p>
						<nav aria-label="Footer" class="flex flex-wrap gap-4 font-mono text-xs text-neutral-500">
							<a href="/discover" class="hover:text-lime-300">Discover</a>
							<a href="/shop" class="hover:text-lime-300">Shop</a>
							<a href="/#plans" class="hover:text-lime-300">Plans</a>
							<a href="/terms" class="hover:text-lime-300">Terms</a>
							<a href="/privacy" class="hover:text-lime-300">Privacy</a>
							<a href={data.user ? '/account' : '/login'} class="hover:text-lime-300">{data.user ? 'Your account' : 'Claim your corner'}</a>
						</nav>
						<p class="font-mono text-[10px] tracking-widest text-neutral-700">ovyn. your identity. your circle.</p>
					</div>
					<div class="flex items-center gap-3 text-sm text-neutral-500"><span>Appearance</span><ThemeToggle /></div>
				</div>
			</footer>
		{/if}
	</div>

	<Toasts />
</QueryClientProvider>

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
		color: #111210;
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
</style>
