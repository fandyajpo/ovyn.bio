<script lang="ts">
	import { page } from '$app/state';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import type { LayoutData } from './$types';
	import '../app.css';
	import Nav from '#lib/components/Nav.svelte';
	import AppNavigation from '#lib/components/AppNavigation.svelte';
	import FooterSurprise from '#lib/components/FooterSurprise.svelte';
	import Toasts from '#lib/components/ui/Toasts.svelte';

	let { data, children }: { data: LayoutData; children: any } = $props();
	const isLanding = $derived(page.url.pathname === '/');

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: 1, refetchOnWindowFocus: false }
		}
	});
</script>

<QueryClientProvider client={queryClient}>
	<div class="app-frame" data-landing={isLanding ? 'true' : 'false'}>
		<a class="skip-link" href="#main-content">Skip to content</a>
		<Nav user={data.user} isAdmin={data.isAdmin} {isLanding} />

		<div class="app-workspace" data-landing={isLanding ? 'true' : 'false'}>
			{#if !isLanding}<AppNavigation isAuthenticated={Boolean(data.user)} isAdmin={data.isAdmin} />{/if}
			<main id="main-content" class="page-content" tabindex="-1">
				<div class="page-container">
					{@render children()}
				</div>
			</main>
		</div>

		<footer class="app-footer mt-10 border-t border-neutral-800/70">
			<div class="app-footer-inner mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:grid-cols-[1fr_auto] sm:items-end">
				<div class="flex flex-col items-start gap-4">
					<span class="sticker sticker--dark">OVYN / INTERNET PERSONHOOD</span>
					<p class="max-w-sm font-[family-name:var(--font-display)] text-xl font-semibold text-neutral-200">Your identity, out in the world.<br /><span class="text-neutral-500">Your people, one link away.</span></p>
					<nav aria-label="Footer" class="flex flex-wrap gap-4 font-mono text-xs text-neutral-500">
						<a href="/discover" class="hover:text-lime-300">Discover</a>
						{#if data.user}<a href="/shop" class="hover:text-lime-300">Shop</a>{/if}
						<a href={data.user ? '/dashboard' : '/login'} class="hover:text-lime-300">{data.user ? 'Your dashboard' : 'Claim your corner'}</a>
					</nav>
					<p class="font-mono text-[10px] uppercase tracking-widest text-neutral-700">OVYN — your identity. your circle.</p>
				</div>
				<FooterSurprise />
			</div>
		</footer>
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
		display: grid;
		min-width: 0;
		flex: 1;
		grid-template-columns: minmax(0, 1fr);
	}

	.page-content {
		width: 100%;
		min-width: 0;
		padding: 1.25rem max(1rem, env(safe-area-inset-right)) calc(6.5rem + env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
	}

	.page-container {
		width: 100%;
		max-width: 90rem;
		margin-inline: auto;
	}

	.app-frame[data-landing='true'] .page-container {
		max-width: 76rem;
	}

	.app-frame[data-landing='true'] .page-content {
		padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));
	}

	.app-frame[data-landing='true'] .app-footer {
		margin-top: 1.5rem;
		padding-bottom: env(safe-area-inset-bottom);
	}

	.app-footer-inner {
		padding-left: max(1rem, env(safe-area-inset-left));
		padding-right: max(1rem, env(safe-area-inset-right));
	}

	:global(.site-header) {
		padding-top: env(safe-area-inset-top);
	}

	:global(.site-header-inner) {
		padding-left: max(1rem, env(safe-area-inset-left));
		padding-right: max(1rem, env(safe-area-inset-right));
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
		.app-workspace:not([data-landing='true']) {
			grid-template-columns: 4.5rem minmax(0, 1fr);
		}

		.page-content {
			padding-block: 1.5rem;
			padding-inline: max(1.25rem, env(safe-area-inset-left)) max(1.25rem, env(safe-area-inset-right));
		}

		.app-frame:not([data-landing='true']) .app-footer {
			padding-bottom: 0;
		}
	}

	@media (min-width: 64rem) {
		.app-workspace:not([data-landing='true']) {
			grid-template-columns: 15rem minmax(0, 1fr);
		}
	}
</style>
