<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { signOut } from '#lib/auth-client';
	import Avatar from './ui/Avatar.svelte';
	import { fade, fly } from 'svelte/transition';
	import { toast } from './ui/toasts.svelte.ts';

	type Viewer = { name: string; image: string | null };

	// The header belongs to a prerendered shell, so the signed-in state is read
	// in the browser. The actions keep their width until it arrives, so nothing
	// jumps when it does.
	let viewer = $state<Viewer | null>(null);
	let sessionChecked = $state(false);

	onMount(() => {
		let cancelled = false;
		void (async () => {
			try {
				const res = await fetch('/api/auth/get-session', { headers: { accept: 'application/json' } });
				if (res.ok) {
					const body = (await res.json()) as { user?: { name?: string; image?: string | null } } | null;
					const name = body?.user?.name;
					if (!cancelled && name) viewer = { name, image: body?.user?.image ?? null };
				}
			} catch {
				// A failed check simply leaves the signed-out actions in place.
			} finally {
				if (!cancelled) sessionChecked = true;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	let accountMenuOpen = $state(false);
	let mobileMenuOpen = $state(false);
	let accountButton = $state<HTMLButtonElement | undefined>(undefined);
	let accountMenu = $state<HTMLDivElement | undefined>(undefined);
	let mobileMenuButton = $state<HTMLButtonElement | undefined>(undefined);
	let mobileMenuPanel = $state<HTMLElement | undefined>(undefined);

	const links = $derived([
		{ href: '/#features', label: 'Features', icon: '✦', tone: 'blue' },
		{ href: '/discover', label: 'Discover', icon: '✳', tone: 'blue' },
		{ href: '/shop', label: 'Shop', icon: '◇', tone: 'pink' },
		{ href: '/#plans', label: 'Plans', icon: '＋', tone: 'lilac' },
		{ href: '/#faq', label: 'FAQ', icon: '?', tone: 'lilac' }
	]);

	function isActive(href: string) {
		if (href.startsWith('/#')) return page.url.pathname === '/' && page.url.hash === href.slice(1);
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}

	function closeMenus() {
		accountMenuOpen = false;
		mobileMenuOpen = false;
	}

	function toggleAccountMenu() {
		accountMenuOpen = !accountMenuOpen;
		if (accountMenuOpen) mobileMenuOpen = false;
	}

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
		if (mobileMenuOpen) accountMenuOpen = false;
	}

	function closeOnEscape(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		if (mobileMenuOpen) mobileMenuButton?.focus();
		else if (accountMenuOpen) accountButton?.focus();
		closeMenus();
	}

	function closeOnOutsidePointerDown(event: PointerEvent) {
		if (!(event.target instanceof Node)) return;
		if (accountMenuOpen && !accountMenu?.contains(event.target) && !accountButton?.contains(event.target)) {
			accountMenuOpen = false;
		}
		if (mobileMenuOpen && !mobileMenuPanel?.contains(event.target) && !mobileMenuButton?.contains(event.target)) {
			mobileMenuOpen = false;
		}
	}

	async function logout() {
		closeMenus();
		await signOut();
		viewer = null;
		toast('info', 'Signed out');
		location.href = '/';
	}
</script>

<svelte:window onkeydown={closeOnEscape} onpointerdown={closeOnOutsidePointerDown} />

<header class="site-header sticky top-0 z-40">
	<div class="site-header-inner flex h-16 w-full items-center justify-between px-4">
		<a href="/" onclick={closeMenus} class="group flex shrink-0 items-center gap-2 font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
			<span class="grid size-8 rotate-[-6deg] place-items-center rounded-xl border-2 border-[#111210] bg-lime-300 font-mono text-sm text-neutral-950 shadow-[2px_2px_0_rgba(255,255,255,0.3)] transition-transform group-hover:rotate-6">o</span>
			<span>ovyn<span class="text-lime-300">.</span></span>
			<span class="sticker sticker--dark hidden xl:inline-flex">your corner</span>
		</a>

		<nav class="desktop-navigation" aria-label="Primary">
			{#each links as link (link.href)}
				{@const active = isActive(link.href)}
				<a href={link.href} class="top-nav-link" data-tone={link.tone} aria-current={active ? 'page' : undefined} onclick={closeMenus}>{link.label}</a>
			{/each}
		</nav>

		<div class="nav-actions">
			{#if viewer}
				<div class="relative">
					<button type="button" bind:this={accountButton} onclick={toggleAccountMenu} class="account-trigger" aria-label={accountMenuOpen ? 'Close account menu' : 'Open account menu'} aria-expanded={accountMenuOpen} aria-controls="account-menu">
						<span class="account-avatar">
							<Avatar name={viewer.name} src={viewer.image} size="sm" />
						</span>
					</button>

					{#if accountMenuOpen}
						<div id="account-menu" bind:this={accountMenu} role="group" aria-label="Account links" class="account-menu absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border py-1 shadow-xl" transition:fly={{ y: -6, duration: 150 }}>
							<div class="account-menu-head">
								<span class="account-avatar account-avatar--menu">
									<Avatar name={viewer.name} src={viewer.image} size="sm" />
								</span>
								<div class="min-w-0">
									<p class="truncate text-sm font-medium text-neutral-100">{viewer.name}</p>
									<p class="account-menu-caption">Signed in</p>
								</div>
							</div>
							<hr class="my-1 border-neutral-800" />
							<a href="/account" onclick={closeMenus} class="block min-h-11 px-4 py-3 text-sm text-neutral-300 transition-colors hover:bg-neutral-800">Account overview</a>
							<a href="/customize" onclick={closeMenus} class="block min-h-11 px-4 py-3 text-sm text-neutral-300 transition-colors hover:bg-neutral-800">Customize page</a>
							<a href="/upgrade" onclick={closeMenus} class="block min-h-11 px-4 py-3 text-sm text-neutral-300 transition-colors hover:bg-neutral-800">Plans &amp; upgrade</a>
							<hr class="my-1 border-neutral-800" />
							<button type="button" onclick={logout} class="block min-h-11 w-full px-4 py-3 text-left text-sm text-red-400 transition-colors hover:bg-neutral-800">Sign out</button>
						</div>
					{/if}
				</div>
			{:else if sessionChecked}
				<a href="/login" class="inline-flex min-h-10 shrink-0 items-center rounded-full bg-lime-300 px-3.5 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-lime-200">Sign in</a>
			{:else}
				<span class="account-placeholder" aria-hidden="true"></span>
			{/if}

			<button type="button" bind:this={mobileMenuButton} onclick={toggleMobileMenu} class="mobile-menu-toggle" aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileMenuOpen} aria-controls="mobile-primary-menu">
				<span class="menu-glyph" aria-hidden="true"><span></span></span>
			</button>
		</div>
	</div>
</header>

{#if mobileMenuOpen}
	<div class="mobile-menu-overlay" transition:fade={{ duration: 180 }}>
		<button type="button" class="mobile-menu-backdrop" onclick={closeMenus} aria-label="Close navigation menu"></button>
		<nav id="mobile-primary-menu" class="mobile-menu-panel" bind:this={mobileMenuPanel} aria-label="Primary navigation" transition:fly={{ y: -10, duration: 190 }}>
			<div class="mobile-menu-heading">
				<div>
					<span class="sticker sticker--pink">ovyn / your corner</span>
					<h2>Where to next?</h2>
				</div>
				<button type="button" class="mobile-menu-close" onclick={closeMenus} aria-label="Close navigation menu">×</button>
			</div>

			<div class="mobile-menu-links">
				{#each links as link (link.href)}
					{@const active = isActive(link.href)}
					<a href={link.href} class="mobile-menu-link" data-tone={link.tone} aria-current={active ? 'page' : undefined} onclick={closeMenus}>
						<span class="mobile-menu-icon" aria-hidden="true">{link.icon}</span>
						<span class="mobile-menu-label">{link.label}</span>
						<span class="mobile-menu-arrow" aria-hidden="true">↗</span>
					</a>
				{/each}
			</div>

			{#if viewer}
				<section class="mobile-menu-account" aria-label="Account shortcuts">
					<p class="mobile-menu-caption">Your account</p>
					<div class="mobile-account-links">
						<a href="/account" onclick={closeMenus}>Account overview</a>
						<a href="/customize" onclick={closeMenus}>Customize</a>
						<a href="/upgrade" onclick={closeMenus}>Upgrade</a>
						<button type="button" onclick={logout}>Sign out</button>
					</div>
				</section>
			{/if}
		</nav>
	</div>
{/if}

<style>
	.site-header {
		border-bottom: 1px solid var(--color-divider);
		background:
			radial-gradient(ellipse at 12% 0%, color-mix(in srgb, var(--color-pop-pink) 14%, transparent), transparent 58%),
			radial-gradient(ellipse at 88% 0%, color-mix(in srgb, var(--color-pop-blue) 13%, transparent), transparent 58%),
			var(--color-nav-glass);
		backdrop-filter: blur(18px);
		box-shadow: 0 4px 18px rgb(0 0 0 / 18%);
	}

	.site-header-inner {
		gap: clamp(0.75rem, 2vw, 1.75rem);
	}

	.nav-actions {
		display: flex;
		flex: 0 0 auto;
		align-items: center;
		gap: 0.4rem;
	}

	.account-placeholder {
		display: inline-block;
		width: 5.75rem;
		height: 2.5rem;
		flex: 0 0 auto;
		border: 1px solid var(--color-divider);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-surface) 60%, transparent);
	}

	.account-trigger {
		display: grid;
		width: 2.55rem;
		height: 2.55rem;
		place-items: center;
		border: 1px solid var(--color-divider);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-surface) 82%, transparent);
		padding: 0;
		cursor: pointer;
		transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
	}

	.account-trigger:hover {
		border-color: color-mix(in srgb, var(--color-accent) 48%, transparent);
		box-shadow: 0 0 0 3px var(--color-accent-soft);
	}

	.account-trigger:active { transform: scale(0.96); }

	.account-avatar {
		display: grid;
		width: 2.05rem;
		height: 2.05rem;
		place-items: center;
		overflow: hidden;
		border-radius: 999px;
	}

	.account-avatar :global(img) {
		width: 100%;
		height: 100%;
		border-radius: 999px;
		object-fit: cover;
	}

	.account-avatar :global(span) { border-radius: 999px; }

	.account-menu-head {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.55rem 0.75rem 0.6rem;
	}

	.account-avatar--menu { width: 2.2rem; height: 2.2rem; }

	.account-menu-caption {
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.58rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.desktop-navigation {
		display: none;
	}

	.top-nav-link {
		--nav-accent: var(--color-accent);
		display: inline-flex;
		min-height: 2.85rem;
		align-items: center;
		justify-content: center;
		border: 1px solid transparent;
		border-radius: 999px;
		padding: 0.65rem 0.85rem;
		color: var(--color-muted);
		font-size: 0.9rem;
		font-weight: 600;
		text-decoration: none;
		white-space: nowrap;
		transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
	}

	.top-nav-link[data-tone='blue'],
	.mobile-menu-link[data-tone='blue'] {
		--nav-accent: var(--color-pop-blue);
	}

	.top-nav-link[data-tone='pink'],
	.mobile-menu-link[data-tone='pink'] {
		--nav-accent: var(--color-pop-pink);
	}

	.top-nav-link[data-tone='lilac'],
	.mobile-menu-link[data-tone='lilac'] {
		--nav-accent: var(--color-pop-lilac);
	}

	.top-nav-link[aria-current='page'] {
		border-color: color-mix(in srgb, var(--nav-accent) 34%, transparent);
		background: color-mix(in srgb, var(--nav-accent) 13%, transparent);
		color: var(--color-foreground);
	}

	.mobile-menu-toggle {
		display: grid;
		width: 2.75rem;
		height: 2.75rem;
		flex: 0 0 auto;
		place-items: center;
		border: 1px solid var(--color-divider);
		border-radius: 0.9rem;
		background: var(--color-surface);
		color: var(--color-foreground);
		box-shadow: 3px 3px 0 color-mix(in srgb, var(--color-pop-blue) 22%, transparent);
		transition: background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
	}

	.mobile-menu-toggle:hover,
	.mobile-menu-toggle[aria-expanded='true'] {
		border-color: color-mix(in srgb, var(--color-pop-pink) 52%, transparent);
		background: var(--color-surface-raised);
		box-shadow: 3px 3px 0 color-mix(in srgb, var(--color-pop-pink) 30%, transparent);
	}

	.menu-glyph,
	.menu-glyph::before,
	.menu-glyph::after {
		position: relative;
		display: block;
		width: 1.1rem;
		height: 2px;
		border-radius: 2px;
		background: currentColor;
		transition: transform 160ms ease, opacity 160ms ease;
	}

	.menu-glyph::before,
	.menu-glyph::after {
		position: absolute;
		left: 0;
		content: '';
	}

	.menu-glyph::before { transform: translateY(-0.35rem); }
	.menu-glyph::after { transform: translateY(0.35rem); }
	.mobile-menu-toggle[aria-expanded='true'] .menu-glyph { background: transparent; }
	.mobile-menu-toggle[aria-expanded='true'] .menu-glyph::before { transform: rotate(45deg); }
	.mobile-menu-toggle[aria-expanded='true'] .menu-glyph::after { transform: rotate(-45deg); }

	.mobile-menu-overlay {
		position: fixed;
		z-index: 50;
		top: calc(4rem + env(safe-area-inset-top));
		right: 0;
		bottom: 0;
		left: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		background:
			radial-gradient(ellipse at 0% 0%, color-mix(in srgb, var(--color-pop-pink) 12%, transparent), transparent 54%),
			radial-gradient(ellipse at 100% 0%, color-mix(in srgb, var(--color-pop-blue) 12%, transparent), transparent 54%),
			color-mix(in srgb, var(--color-background) 88%, transparent);
		backdrop-filter: blur(18px);
	}

	.mobile-menu-backdrop {
		position: absolute;
		inset: 0;
		width: 100%;
		min-height: 100%;
		border: 0;
		background: transparent;
	}

	.mobile-menu-panel {
		position: relative;
		z-index: 1;
		width: min(100%, 46rem);
		min-height: 100%;
		margin-inline: auto;
		border-inline: 1px solid var(--color-divider);
		background: linear-gradient(165deg, color-mix(in srgb, var(--color-surface) 96%, transparent), color-mix(in srgb, var(--color-background) 98%, transparent));
		padding: 1.25rem max(1.25rem, env(safe-area-inset-right)) calc(1.5rem + env(safe-area-inset-bottom)) max(1.25rem, env(safe-area-inset-left));
	}

	.mobile-menu-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 1.25rem;
	}

	.mobile-menu-heading h2 {
		margin: 0.85rem 0 0;
		font-family: var(--font-display);
		font-size: clamp(1.4rem, 5vw, 1.8rem);
		font-weight: 700;
		letter-spacing: -0.04em;
	}

	.mobile-menu-close {
		display: grid;
		width: 2.75rem;
		height: 2.75rem;
		flex: 0 0 auto;
		place-items: center;
		border: 1px solid var(--color-divider);
		border-radius: 0.9rem;
		background: var(--color-surface-raised);
		color: var(--color-foreground);
		font-size: 1.5rem;
		line-height: 1;
	}

	.mobile-menu-links {
		display: grid;
		gap: 0.65rem;
	}

	.mobile-menu-link {
		--nav-accent: var(--color-accent);
		display: flex;
		min-height: 4.1rem;
		align-items: center;
		gap: 0.9rem;
		border: 1px solid color-mix(in srgb, var(--nav-accent) 26%, transparent);
		border-radius: 1.1rem;
		background: color-mix(in srgb, var(--nav-accent) 8%, var(--color-surface));
		padding: 0.7rem 0.85rem;
		color: var(--color-foreground);
		text-decoration: none;
		transition: transform 160ms ease, background-color 160ms ease, border-color 160ms ease;
	}

	.mobile-menu-icon {
		display: grid;
		width: 2.5rem;
		height: 2.5rem;
		flex: 0 0 auto;
		place-items: center;
		border-radius: 0.8rem;
		background: var(--nav-accent);
		color: var(--color-background);
		font-size: 1.1rem;
	}

	.mobile-menu-label {
		min-width: 0;
		flex: 1;
		font-family: var(--font-display);
		font-size: 1.05rem;
		font-weight: 600;
	}

	.mobile-menu-arrow {
		color: var(--nav-accent);
		font-size: 1.1rem;
	}

	.mobile-menu-link[aria-current='page'] {
		border-color: color-mix(in srgb, var(--nav-accent) 58%, transparent);
		background: color-mix(in srgb, var(--nav-accent) 16%, var(--color-surface));
	}

	.mobile-menu-link:focus-visible {
		outline: 2px solid var(--nav-accent);
		outline-offset: 2px;
	}

	.mobile-menu-account {
		margin-top: 1.5rem;
		border-top: 1px solid var(--color-divider);
		padding-top: 1.25rem;
	}

	.mobile-menu-caption {
		margin: 0 0 0.75rem;
		color: var(--color-muted);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.65rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.mobile-account-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.mobile-account-links a,
	.mobile-account-links button {
		display: inline-flex;
		min-height: 2.75rem;
		align-items: center;
		border: 1px solid var(--color-divider);
		border-radius: 0.8rem;
		background: var(--color-surface);
		padding: 0.6rem 0.85rem;
		color: var(--color-foreground);
		font: inherit;
		font-size: 0.85rem;
		text-decoration: none;
	}

	.mobile-account-links button { color: var(--color-pop-pink); }
	.account-menu {
		border-color: var(--color-divider);
		background: var(--color-menu-glass);
		box-shadow: 0 18px 42px rgb(0 0 0 / 18%);
	}

	@media (min-width: 64rem) {
		.desktop-navigation {
			display: flex;
			min-width: 0;
			flex: 1;
			align-items: center;
			justify-content: center;
			gap: clamp(0.15rem, 0.45vw, 0.55rem);
			padding-inline: clamp(0.25rem, 1vw, 1rem);
		}

		.mobile-menu-toggle,
		.mobile-menu-overlay { display: none; }
	}

	@media (max-width: 63.999rem) {
		.desktop-navigation { display: none; }
	}

	@media (hover: hover) and (pointer: fine) {
		.top-nav-link:hover:not([aria-current='page']) {
			border-color: color-mix(in srgb, var(--nav-accent) 26%, transparent);
			background: color-mix(in srgb, var(--nav-accent) 9%, transparent);
			color: var(--color-foreground);
		}

		.mobile-menu-link:hover {
			transform: translateX(3px);
			border-color: color-mix(in srgb, var(--nav-accent) 58%, transparent);
			background: color-mix(in srgb, var(--nav-accent) 15%, var(--color-surface));
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.top-nav-link,
		.mobile-menu-toggle,
		.menu-glyph,
		.menu-glyph::before,
		.menu-glyph::after,
		.mobile-menu-link,
		.mobile-menu-overlay,
		.account-menu { animation: none; transition: none; }
	}
</style>
