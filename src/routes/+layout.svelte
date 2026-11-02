<script lang="ts">
	import { page } from '$app/state';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import type { LayoutData } from './$types';
	import '../app.css';
	import Nav from '#lib/components/Nav.svelte';
	import FooterSurprise from '#lib/components/FooterSurprise.svelte';
	import Toasts from '#lib/components/ui/Toasts.svelte';

	let { data, children }: { data: LayoutData; children: any } = $props();
	const isLanding = $derived(page.url.pathname === '/');
	const isProfilePage = $derived(page.route.id?.endsWith('/[username]') ?? false);

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
	<div class="app-frame" data-landing={isLanding ? 'true' : 'false'} data-profile-page={isProfilePage ? 'true' : 'false'}>
		<a class="skip-link" href="#main-content">Skip to content</a>
		{#if !isProfilePage}<Nav user={data.user} isAdmin={data.isAdmin} {isLanding} />{/if}

		<div class="app-workspace">
			<main id="main-content" class={['page-content', isProfilePage && 'profile-page-content']} tabindex="-1">
				<div class={['page-container', isProfilePage && 'profile-page-container']}>
					{@render children()}
				</div>
			</main>
		</div>

		{#if !isProfilePage}
			<footer class="app-footer mt-10 border-t border-neutral-800/70">
				<div class="app-footer-inner mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:grid-cols-[1fr_auto] sm:items-end">
					<div class="flex flex-col items-start gap-4">
						<span class="sticker sticker--dark">OVYN / INTERNET PERSONHOOD</span>
						<p class="max-w-sm font-[family-name:var(--font-display)] text-xl font-semibold text-neutral-200">Your identity, out in the world.<br /><span class="text-neutral-500">Your people, one link away.</span></p>
						<nav aria-label="Footer" class="flex flex-wrap gap-4 font-mono text-xs text-neutral-500">
							<a href="/discover" class="hover:text-lime-300">Discover</a>
							{#if data.user}<a href="/shop" class="hover:text-lime-300">Shop</a>{/if}
							<a href={data.user ? '/account' : '/login'} class="hover:text-lime-300">{data.user ? 'Your account' : 'Claim your corner'}</a>
						</nav>
						<p class="font-mono text-[10px] uppercase tracking-widest text-neutral-700">OVYN — your identity. your circle.</p>
					</div>
					<FooterSurprise />
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
		margin-top: 1.5rem;
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
