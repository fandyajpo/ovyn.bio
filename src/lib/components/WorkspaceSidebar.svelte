<script lang="ts">
	import { page } from '$app/state';
	import { fade } from 'svelte/transition';
	import { signOut } from '#lib/auth-client';
	import Avatar from './ui/Avatar.svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	let {
		profileSlug,
		planTier,
		userName,
		userImage
	}: {
		profileSlug: string;
		planTier: 'free' | 'premium';
		userName: string;
		userImage: string | null;
	} = $props();

	let mobileOpen = $state(false);
	let menuTrigger = $state<HTMLButtonElement | undefined>(undefined);
	let shareMessage = $state('Share your profile');

	const accountLinks = [
		{ href: '/account', label: 'Overview' },
		{ href: '/guild', label: 'Circle' },
		{ href: '/dashboard', label: 'Activity dashboard' },
		{ href: '/account/analytics', label: 'Analytics' },
		{ href: '/account/badges', label: 'Badges' },
		{ href: '/account/settings', label: 'Account settings' }
	];
	const creatorLinks = [
		{ href: '/settings/profile', label: 'Profile details' },
		{ href: '/customize', label: 'Customize page' },
		{ href: '/links', label: 'Social links' },
		{ href: '/upgrade', label: 'Plans and upgrade' },
		{ href: '/templates', label: 'Templates' },
		{ href: '/help', label: 'Help center' }
	];

	function isActive(href: string) {
		return href === '/account'
			? page.url.pathname === href
			: page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}

	function closeMobileMenu() {
		mobileOpen = false;
	}

	function onKeydown(event: KeyboardEvent) {
		if (mobileOpen && event.key === 'Escape') {
			closeMobileMenu();
			menuTrigger?.focus();
		}
	}

	async function shareProfile() {
		try {
			await navigator.clipboard.writeText(new URL(`/${profileSlug}`, window.location.origin).toString());
			shareMessage = 'Profile link copied';
		} catch {
			shareMessage = 'Copy unavailable';
		}
		setTimeout(() => (shareMessage = 'Share your profile'), 1800);
	}

	async function logout() {
		closeMobileMenu();
		await signOut();
		location.href = '/';
	}
</script>

<svelte:window onkeydown={onKeydown} />

<button
	bind:this={menuTrigger}
	type="button"
	class="workspace-menu-trigger"
	aria-label={mobileOpen ? 'Close account menu' : 'Open account menu'}
	aria-expanded={mobileOpen}
	aria-controls="workspace-navigation"
	onclick={() => (mobileOpen = !mobileOpen)}
>
	<span class="workspace-menu-glyph" aria-hidden="true">☰</span>
	<span>ovyn</span>
</button>

{#if mobileOpen}
	<button
		type="button"
		class="workspace-sidebar-backdrop"
		aria-label="Close account menu"
		onclick={closeMobileMenu}
		transition:fade={{ duration: 180 }}
	></button>
{/if}

<aside
	id="workspace-navigation"
	class={['workspace-sidebar', mobileOpen && 'workspace-sidebar--mobile-open']}
	aria-label="Account workspace"
>
	<div class="workspace-sidebar-heading">
		<div>
			<a href="/" class="workspace-brand" onclick={closeMobileMenu}>ovyn<span aria-hidden="true">.</span></a>
			<p class="mt-1 text-sm font-medium text-neutral-400">Account menu</p>
		</div>
		<span class="workspace-plan-pill {planTier === 'premium' ? 'workspace-plan-pill--premium' : ''}">{planTier}</span>
		<button type="button" class="workspace-sidebar-close" aria-label="Close account menu" onclick={closeMobileMenu}>×</button>
	</div>

	<div class="workspace-user-summary">
		<Avatar name={userName} src={userImage} size="md" />
		<div class="min-w-0">
			<p class="truncate text-sm font-medium text-neutral-100">{userName}</p>
			<p class="truncate text-xs text-neutral-500">@{profileSlug}</p>
		</div>
	</div>

	<nav class="workspace-nav-grid" aria-label="Workspace navigation">
		<section class="workspace-nav-section">
			<h2>Account</h2>
			{#each accountLinks as link (link.href)}
				<a href={link.href} aria-current={isActive(link.href) ? 'page' : undefined} class="workspace-link" onclick={closeMobileMenu}>{link.label}</a>
			{/each}
		</section>
		<section class="workspace-nav-section">
			<h2>Creator tools</h2>
			{#each creatorLinks as link (link.href)}
				<a href={link.href} aria-current={isActive(link.href) ? 'page' : undefined} class="workspace-link" onclick={closeMobileMenu}>{link.label}</a>
			{/each}
			<a href="/{profileSlug}" target="_blank" rel="noreferrer" class="workspace-link" onclick={closeMobileMenu}>My public page ↗</a>
		</section>
	</nav>

	<button type="button" class="workspace-share-button" onclick={shareProfile}>{shareMessage}</button>
	<a class="workspace-landing-link" href="/" onclick={closeMobileMenu}>← Back to landing page</a>

	<div class="workspace-tools">
		<div class="workspace-appearance"><span>Appearance</span><ThemeToggle /></div>
		<button type="button" class="workspace-signout" onclick={logout}>Sign out</button>
	</div>
</aside>

<style>
	.workspace-sidebar {
		border-radius: 1.25rem;
		padding: 1rem;
		box-shadow: none;
	}

	.workspace-sidebar-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.workspace-brand {
		display: inline-flex;
		align-items: baseline;
		color: var(--color-foreground);
		font-family: var(--font-display);
		font-size: 1.3rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		text-decoration: none;
	}

	.workspace-brand span { color: var(--color-accent); }

	.workspace-plan-pill {
		border: 1px solid var(--color-divider);
		border-radius: 999px;
		padding: 0.35rem 0.65rem;
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.workspace-plan-pill--premium { border-color: color-mix(in srgb, var(--color-accent) 36%, transparent); color: var(--color-accent); }
	.workspace-user-summary { display: flex; align-items: center; gap: 0.8rem; border-bottom: 1px solid var(--color-divider); padding: 0.25rem 0 1rem; margin-bottom: 1rem; }
	.workspace-nav-grid { display: grid; gap: 1rem; }
	.workspace-nav-section { display: grid; align-content: start; gap: 0.2rem; }
	.workspace-nav-section h2 { padding: 0.35rem 0.7rem; color: var(--color-muted); font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.16em; text-transform: uppercase; }

	.workspace-link {
		display: flex;
		min-height: 2.6rem;
		align-items: center;
		border: 1px solid transparent;
		border-radius: 0.75rem;
		padding: 0.55rem 0.75rem;
		color: var(--color-muted);
		font-size: 0.875rem;
		text-decoration: none;
		transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease, transform 150ms ease;
	}

	.workspace-link:hover,
	.workspace-link[aria-current='page'] {
		border-color: color-mix(in srgb, var(--color-accent) 24%, transparent);
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
		color: var(--color-foreground);
	}

	.workspace-link:active { transform: scale(0.985); }
	.workspace-share-button { width: 100%; min-height: 2.8rem; margin-top: 1rem; border: 1px solid var(--color-divider); border-radius: 0.9rem; background: transparent; padding: 0.65rem 0.8rem; color: var(--color-muted); font-size: 0.8rem; text-align: left; transition: border-color 160ms ease, color 160ms ease, transform 160ms ease; }
	.workspace-share-button:hover { border-color: color-mix(in srgb, var(--color-accent) 32%, transparent); color: var(--color-accent); }
	.workspace-landing-link {
		display: flex;
		min-height: 2.6rem;
		align-items: center;
		margin-top: 0.5rem;
		border-radius: 0.75rem;
		padding: 0.55rem 0.75rem;
		color: var(--color-muted);
		font-size: 0.8rem;
		text-decoration: none;
		transition: color 160ms ease, background-color 160ms ease;
	}

	.workspace-landing-link:hover { background: color-mix(in srgb, var(--color-accent) 8%, transparent); color: var(--color-foreground); }

	.workspace-tools {
		display: grid;
		gap: 0.75rem;
		margin-top: 1rem;
		border-top: 1px solid var(--color-divider);
		padding-top: 1rem;
		color: var(--color-muted);
		font-size: 0.8rem;
	}

	.workspace-appearance {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.workspace-signout {
		min-height: 2.75rem;
		border: 1px solid var(--color-divider);
		border-radius: 0.85rem;
		background: transparent;
		padding: 0.6rem 0.8rem;
		color: var(--color-pop-pink);
		text-align: left;
		cursor: pointer;
	}

	.workspace-menu-trigger,
	.workspace-sidebar-close,
	.workspace-sidebar-backdrop { display: none; }

	@media (min-width: 64rem) {
		.workspace-sidebar { position: sticky; top: 1.5rem; max-height: calc(100dvh - 3rem); overflow-y: auto; overscroll-behavior: contain; align-self: start; }
	}

	@media (max-width: 63.999rem) {
		.workspace-menu-trigger {
			position: fixed;
			z-index: 71;
			top: calc(0.75rem + env(safe-area-inset-top));
			left: calc(1rem + env(safe-area-inset-left));
			display: inline-flex;
			min-height: 2.75rem;
			align-items: center;
			gap: 0.65rem;
			border: 1px solid var(--color-divider);
			border-radius: 999px;
			background: color-mix(in srgb, var(--color-surface) 92%, transparent);
			padding: 0.45rem 0.9rem 0.45rem 0.65rem;
			color: var(--color-foreground);
			font-size: 0.75rem;
			font-weight: 600;
			letter-spacing: 0.08em;
			box-shadow: 0 10px 30px rgb(0 0 0 / 12%);
			backdrop-filter: blur(16px);
			transition: transform 160ms ease, background-color 160ms ease;
		}

		.workspace-menu-trigger:active { transform: scale(0.96); }
		.workspace-menu-glyph { color: var(--color-accent); font-size: 1rem; }

		.workspace-sidebar {
			position: fixed;
			z-index: 73;
			top: 0;
			bottom: 0;
			left: 0;
			width: min(21rem, calc(100vw - 3rem));
			max-height: 100dvh;
			height: 100dvh;
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

		.workspace-sidebar--mobile-open { transform: translateX(0); visibility: visible; transition-delay: 0s; }
		.workspace-sidebar-close { display: grid; width: 2.5rem; height: 2.5rem; flex: 0 0 auto; place-items: center; border: 0; border-radius: 50%; background: var(--color-accent-soft); color: var(--color-foreground); font-size: 1.4rem; }
		.workspace-sidebar-backdrop { position: fixed; z-index: 72; inset: 0; display: block; width: 100%; height: 100%; border: 0; background: rgb(10 10 14 / 56%); backdrop-filter: blur(8px); }
		.workspace-tools { display: grid; gap: 1rem; margin-top: 1.25rem; border-top: 1px solid var(--color-divider); padding-top: 1rem; color: var(--color-muted); font-size: 0.8rem; }
		.workspace-signout { min-height: 2.75rem; border: 1px solid var(--color-divider); border-radius: 0.85rem; background: transparent; padding: 0.6rem 0.8rem; color: var(--color-pop-pink); text-align: left; }
	}

	@media (prefers-reduced-motion: reduce) {
		.workspace-link,
		.workspace-share-button,
		.workspace-landing-link,
		.workspace-sidebar,
		.workspace-menu-trigger { transition: none; }
	}
</style>
