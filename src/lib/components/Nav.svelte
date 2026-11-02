<script lang="ts">
	import { signOut } from '#lib/auth-client';
	import Avatar from './ui/Avatar.svelte';
	import { toast } from './ui/toasts.svelte.ts';

	let {
		user,
		isAdmin,
		isLanding
	}: {
		user: { name: string; image: string | null } | null;
		isAdmin: boolean;
		isLanding: boolean;
	} = $props();

	let accountMenuOpen = $state(false);
	let landingMenuOpen = $state(false);
	let accountButton = $state<HTMLButtonElement | undefined>(undefined);
	let accountMenu = $state<HTMLDivElement | undefined>(undefined);
	let landingNavigation = $state<HTMLElement | undefined>(undefined);
	let landingMenuButton = $state<HTMLButtonElement | undefined>(undefined);

	const landingLinks = $derived([
		{ href: '#features', label: 'Features', tone: 'blue' },
		{ href: '/discover', label: 'Discover', tone: 'lime' },
		...(user ? [{ href: '/shop', label: 'Shop', tone: 'pink' }] : []),
		{ href: '#faq', label: 'FAQ', tone: 'lilac' }
	]);

	function closeMenus() {
		accountMenuOpen = false;
		landingMenuOpen = false;
	}

	function toggleAccountMenu() {
		accountMenuOpen = !accountMenuOpen;
		if (accountMenuOpen) landingMenuOpen = false;
	}

	function toggleLandingMenu() {
		landingMenuOpen = !landingMenuOpen;
		if (landingMenuOpen) accountMenuOpen = false;
	}

	function closeOnEscape(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (accountMenuOpen) accountButton?.focus();
			else if (landingMenuOpen) landingMenuButton?.focus();
			closeMenus();
		}
	}

	function closeOnOutsidePointerDown(event: PointerEvent) {
		if (!(event.target instanceof Node)) return;

		if (accountMenuOpen && !accountMenu?.contains(event.target) && !accountButton?.contains(event.target)) {
			accountMenuOpen = false;
		}
		if (landingMenuOpen && !landingNavigation?.contains(event.target)) {
			landingMenuOpen = false;
		}
	}

	async function logout() {
		closeMenus();
		await signOut();
		toast('info', 'Signed out');
		location.href = '/';
	}
</script>

<svelte:window onkeydown={closeOnEscape} onpointerdown={closeOnOutsidePointerDown} />

<header class="site-header sticky top-0 z-40">
	<div class="site-header-inner flex h-16 w-full items-center justify-between px-4">
		<a href="/" onclick={closeMenus} class="group flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
			<span class="grid size-8 rotate-[-6deg] place-items-center rounded-xl border-2 border-[#111210] bg-lime-300 font-mono text-sm text-neutral-950 shadow-[2px_2px_0_rgba(255,255,255,0.3)] transition-transform group-hover:rotate-6">O</span>
			<span>OVYN<span class="text-lime-300">.</span></span>
			<span class="sticker sticker--dark hidden sm:inline-flex">YOUR CORNER</span>
		</a>

		{#if isLanding}
			<nav class="landing-navigation" aria-label="Landing page" bind:this={landingNavigation}>
				<button
					type="button"
					bind:this={landingMenuButton}
					onclick={toggleLandingMenu}
					class="landing-menu-toggle"
					aria-label={landingMenuOpen ? 'Close site navigation' : 'Open site navigation'}
					aria-expanded={landingMenuOpen}
					aria-controls="landing-links"
				>
					<span class="menu-glyph" aria-hidden="true"><span></span></span>
				</button>
				<div id="landing-links" class={landingMenuOpen ? 'landing-links open' : 'landing-links'}>
					{#each landingLinks as link (link.href)}
						<a href={link.href} data-tone={link.tone} onclick={closeMenus}>{link.label}</a>
					{/each}
				</div>
			</nav>
		{/if}

		{#if user}
			<div class="relative">
				<button
					type="button"
					bind:this={accountButton}
					onclick={toggleAccountMenu}
					class="account-trigger flex min-h-11 items-center gap-2 rounded-full p-1 transition-colors"
					aria-label={accountMenuOpen ? 'Close account menu' : 'Open account menu'}
					aria-expanded={accountMenuOpen}
					aria-controls="account-menu"
				>
					<Avatar name={user.name} src={user.image} size="sm" />
					<span class="hidden text-sm text-neutral-300 sm:inline">Account</span>
				</button>

				{#if accountMenuOpen}
					<div
						id="account-menu"
						bind:this={accountMenu}
						role="group"
						aria-label="Account links"
						class="account-menu absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border py-1 shadow-xl"
					>
						<a href="/settings/profile" onclick={closeMenus} class="block min-h-11 px-4 py-3 text-sm text-neutral-300 transition-colors hover:bg-neutral-800">Profile settings</a>
						<a href="/billing" onclick={closeMenus} class="block min-h-11 px-4 py-3 text-sm text-neutral-300 transition-colors hover:bg-neutral-800">Billing</a>
						{#if isAdmin}<a href="/admin" onclick={closeMenus} class="block min-h-11 px-4 py-3 text-sm text-lime-300 transition-colors hover:bg-neutral-800">Monetization admin</a>{/if}
						<hr class="my-1 border-neutral-800" />
						<button type="button" onclick={logout} class="block min-h-11 w-full px-4 py-3 text-left text-sm text-red-400 transition-colors hover:bg-neutral-800">
							Sign out
						</button>
					</div>
				{/if}
			</div>
		{:else}
			<a
				href="/login"
				class="inline-flex min-h-11 items-center rounded-lg bg-lime-300 px-4 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-lime-200"
			>
				Sign in
			</a>
		{/if}
	</div>
</header>

<style>
	.landing-navigation {
		position: relative;
		display: flex;
		align-items: center;
		margin-left: auto;
		margin-right: 0.5rem;
	}

	.landing-menu-toggle {
		display: grid;
		width: 2.75rem;
		height: 2.75rem;
		place-items: center;
		border: 1px solid var(--color-divider);
		border-radius: 0.9rem;
		background: var(--color-surface);
		color: var(--color-foreground);
		transition: background-color 160ms ease, border-color 160ms ease;
	}

	.landing-menu-toggle:hover,
	.landing-menu-toggle[aria-expanded='true'] {
		border-color: color-mix(in srgb, var(--color-pop-blue) 42%, transparent);
		background: var(--color-surface-raised);
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

	.menu-glyph::before {
		transform: translateY(-0.35rem);
	}

	.menu-glyph::after {
		transform: translateY(0.35rem);
	}

	.landing-menu-toggle[aria-expanded='true'] .menu-glyph {
		background: transparent;
	}

	.landing-menu-toggle[aria-expanded='true'] .menu-glyph::before {
		transform: rotate(45deg);
	}

	.landing-menu-toggle[aria-expanded='true'] .menu-glyph::after {
		transform: rotate(-45deg);
	}

	.landing-links {
		position: absolute;
		z-index: 30;
		top: calc(100% + 0.65rem);
		right: 0;
		display: flex;
		min-width: 13rem;
		flex-direction: column;
		gap: 0.2rem;
		border: 1px solid var(--color-divider);
		border-radius: 1rem;
		background: var(--color-menu-glass);
		padding: 0.45rem;
		box-shadow: 0 16px 40px rgb(0 0 0 / 35%);
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		transform: translateY(-0.4rem);
		transition: opacity 160ms ease, transform 160ms ease, visibility 0s linear 160ms;
	}

	.landing-links.open {
		opacity: 1;
		visibility: visible;
		pointer-events: auto;
		transform: translateY(0);
		transition-delay: 0s;
	}

	.landing-links a {
		--nav-accent: var(--color-accent);
		display: flex;
		min-height: 2.75rem;
		align-items: center;
		border: 1px solid color-mix(in srgb, var(--nav-accent) 24%, transparent);
		border-radius: 0.8rem;
		background: color-mix(in srgb, var(--nav-accent) 7%, transparent);
		padding: 0.65rem 0.9rem;
		color: var(--color-foreground);
		font-size: 0.9rem;
		font-weight: 600;
		text-decoration: none;
		transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
	}

	.landing-links a[data-tone='blue'] {
		--nav-accent: var(--color-pop-blue);
	}

	.landing-links a[data-tone='pink'] {
		--nav-accent: var(--color-pop-pink);
	}

	.landing-links a[data-tone='lilac'] {
		--nav-accent: var(--color-pop-lilac);
	}

	.landing-links a:hover,
	.landing-links a:focus-visible {
		border-color: color-mix(in srgb, var(--nav-accent) 52%, transparent);
		background: color-mix(in srgb, var(--nav-accent) 18%, transparent);
		color: var(--nav-accent);
	}

	.landing-links a:focus-visible {
		outline: 2px solid var(--nav-accent);
		outline-offset: 1px;
	}

	.account-menu {
		animation: menu-in 150ms ease-out both;
	}

	@keyframes menu-in {
		from { opacity: 0; transform: translateY(-0.35rem); }
		to { opacity: 1; transform: translateY(0); }
	}

	@media (min-width: 48rem) {
		.landing-navigation {
			flex: 1;
			justify-content: center;
			margin: 0;
		}

		.landing-menu-toggle {
			display: none;
		}

		.landing-links,
		.landing-links.open {
			position: static;
			min-width: 0;
			flex-direction: row;
			gap: 0.15rem;
			border: 0;
			background: transparent;
			padding: 0;
			box-shadow: none;
			opacity: 1;
			visibility: visible;
			pointer-events: auto;
			transform: none;
			transition: none;
		}

		.landing-links a {
			min-height: 2.5rem;
			border-radius: 999px;
			padding: 0.55rem 0.7rem;
			font-size: 0.85rem;
		}
	}

	@media (hover: hover) and (pointer: fine) {
		.landing-links a:hover {
			background: color-mix(in srgb, var(--nav-accent) 18%, transparent);
			color: var(--nav-accent);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.landing-links,
		.landing-menu-toggle,
		.menu-glyph,
		.menu-glyph::before,
		.menu-glyph::after,
		.account-menu {
			animation: none;
			transition: none;
		}
	}
</style>
