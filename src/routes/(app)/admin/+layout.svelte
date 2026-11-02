<script lang="ts">
	import { page } from '$app/state';
	import { fade } from 'svelte/transition';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';

	let { children }: { children: any } = $props();

	let menuOpen = $state(false);

	const links = [
		{ href: '/admin', label: 'Overview' },
		{ href: '/admin/catalog', label: 'Catalog' },
		{ href: '/admin/plans', label: 'Plans' },
		{ href: '/admin/orders', label: 'Sales history' },
		{ href: '/admin/analytics', label: 'Sales analytics' }
	];

	const utilityLinks = [
		{ href: '/account', label: 'Back to account' },
		{ href: '/', label: 'Landing page' },
		{ href: '/shop', label: 'Shop' }
	];

	function isActive(href: string) {
		return href === '/admin'
			? page.url.pathname === href
			: page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}

	function closeMenu() {
		menuOpen = false;
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && menuOpen) menuOpen = false;
	}
</script>

<svelte:window onkeydown={onKeydown} />

<button
	type="button"
	class="admin-menu-trigger"
	aria-label={menuOpen ? 'Close admin menu' : 'Open admin menu'}
	aria-expanded={menuOpen}
	aria-controls="admin-navigation"
	onclick={() => (menuOpen = !menuOpen)}
>
	<span class="admin-menu-glyph" aria-hidden="true">☰</span>
	<span>ovyn admin</span>
</button>

{#if menuOpen}
	<button
		type="button"
		class="admin-sidebar-backdrop"
		aria-label="Close admin menu"
		onclick={closeMenu}
		transition:fade={{ duration: 160 }}
	></button>
{/if}

<div class="admin-layout">
	<aside id="admin-navigation" class="admin-sidebar {menuOpen ? 'admin-sidebar--open' : ''}" aria-label="Admin navigation">
		<div class="admin-sidebar-head">
			<div>
				<a href="/" class="admin-brand" onclick={closeMenu}>ovyn<span aria-hidden="true">.</span></a>
				<p class="admin-overline">Admin</p>
			</div>
			<button type="button" class="admin-sidebar-close" aria-label="Close admin menu" onclick={closeMenu}>×</button>
		</div>

		<nav class="admin-links" aria-label="Admin sections">
			{#each links as link (link.href)}
				<a href={link.href} class="admin-link" aria-current={isActive(link.href) ? 'page' : undefined} onclick={closeMenu}>{link.label}</a>
			{/each}
		</nav>

		<nav class="admin-links admin-links-secondary" aria-label="Site links">
			{#each utilityLinks as link (link.href)}
				<a href={link.href} class="admin-link admin-link--utility" onclick={closeMenu}>{link.label}</a>
			{/each}
		</nav>

		<div class="admin-appearance">
			<span>Appearance</span>
			<ThemeToggle />
		</div>
	</aside>

	<div class="admin-content">
		{@render children()}
	</div>
</div>

<style>
	.admin-layout {
		display: grid;
		gap: 1.25rem;
	}

	.admin-menu-trigger {
		position: fixed;
		z-index: 71;
		top: calc(0.75rem + env(safe-area-inset-top));
		left: calc(1rem + env(safe-area-inset-left));
		display: inline-flex;
		min-height: 2.75rem;
		align-items: center;
		gap: 0.6rem;
		border: 1px solid var(--color-divider);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-surface) 92%, transparent);
		padding: 0.45rem 0.9rem 0.45rem 0.7rem;
		color: var(--color-foreground);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		box-shadow: 0 10px 30px rgb(0 0 0 / 12%);
		backdrop-filter: blur(16px);
		transition: transform 160ms ease, background-color 160ms ease;
	}

	.admin-menu-trigger:active { transform: scale(0.96); }
	.admin-menu-glyph { color: var(--color-accent); font-size: 1rem; }

	.admin-sidebar {
		position: fixed;
		z-index: 73;
		top: 0;
		bottom: 0;
		left: 0;
		display: flex;
		width: min(19rem, calc(100vw - 3rem));
		height: 100dvh;
		flex-direction: column;
		gap: 1rem;
		overflow-y: auto;
		overscroll-behavior: contain;
		border: 1px solid var(--color-divider);
		border-radius: 0 1.5rem 1.5rem 0;
		background: color-mix(in srgb, var(--color-background) 96%, transparent);
		padding: calc(1.25rem + env(safe-area-inset-top)) 1rem calc(1rem + env(safe-area-inset-bottom));
		box-shadow: 20px 0 60px rgb(0 0 0 / 24%);
		transform: translateX(-105%);
		visibility: hidden;
		transition: transform 240ms cubic-bezier(0.2, 0.75, 0.25, 1), visibility 0s linear 240ms;
	}

	.admin-sidebar--open {
		transform: translateX(0);
		visibility: visible;
		transition-delay: 0s;
	}

	.admin-sidebar-backdrop {
		position: fixed;
		z-index: 72;
		inset: 0;
		width: 100%;
		height: 100%;
		border: 0;
		background: rgb(10 10 14 / 56%);
		backdrop-filter: blur(8px);
	}

	.admin-sidebar-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		border-bottom: 1px solid var(--color-divider);
		padding-bottom: 1rem;
	}

	.admin-brand {
		color: var(--color-foreground);
		font-family: var(--font-display);
		font-size: 1.3rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		text-decoration: none;
	}

	.admin-brand span { color: var(--color-accent); }

	.admin-overline {
		margin: 0.25rem 0 0;
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}

	.admin-sidebar-close {
		display: grid;
		width: 2.5rem;
		height: 2.5rem;
		flex: 0 0 auto;
		place-items: center;
		border: 0;
		border-radius: 50%;
		background: var(--color-accent-soft);
		color: var(--color-foreground);
		font-size: 1.4rem;
	}

	.admin-links {
		display: grid;
		gap: 0.2rem;
	}

	.admin-links-secondary {
		margin-top: auto;
		border-top: 1px solid var(--color-divider);
		padding-top: 0.75rem;
	}

	.admin-link {
		display: flex;
		min-height: 2.6rem;
		align-items: center;
		border: 1px solid transparent;
		border-radius: 0.75rem;
		padding: 0.55rem 0.75rem;
		color: var(--color-muted);
		font-size: 0.875rem;
		text-decoration: none;
		transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
	}

	.admin-link:hover,
	.admin-link[aria-current='page'] {
		border-color: color-mix(in srgb, var(--color-accent) 24%, transparent);
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
		color: var(--color-foreground);
	}

	.admin-link--utility { font-size: 0.8rem; }
	.admin-content { min-width: 0; }

	.admin-appearance {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		border-top: 1px solid var(--color-divider);
		padding-top: 0.75rem;
		color: var(--color-muted);
		font-size: 0.78rem;
	}

	@media (min-width: 64rem) {
		.admin-layout {
			grid-template-columns: 13rem minmax(0, 1fr);
			gap: 2rem;
			align-items: start;
		}

		.admin-sidebar {
			position: sticky;
			top: 1.5rem;
			left: auto;
			display: flex;
			width: auto;
			height: auto;
			max-height: calc(100dvh - 3rem);
			transform: none;
			visibility: visible;
			border-radius: 1.25rem;
			border: 1px solid var(--color-divider);
			background: var(--color-surface);
			box-shadow: none;
			padding: 1rem;
			transition: none;
		}

		.admin-menu-trigger,
		.admin-sidebar-close,
		.admin-sidebar-backdrop { display: none; }
	}

	@media (prefers-reduced-motion: reduce) {
		.admin-link,
		.admin-sidebar,
		.admin-menu-trigger { transition: none; }
	}
</style>
