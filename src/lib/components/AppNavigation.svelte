<script lang="ts">
	import { page } from '$app/state';

	let { isAuthenticated, isAdmin }: { isAuthenticated: boolean; isAdmin: boolean } = $props();

	const publicLinks = [{ href: '/discover', label: 'Discover', icon: '✳', tone: 'blue' }];

	const memberLinks = [
		{ href: '/shop', label: 'Shop', icon: '◇', tone: 'pink' },
		{ href: '/spotlight', label: 'Spotlight', icon: '↗', tone: 'lilac' },
		{ href: '/guild', label: 'My guild', icon: '◉', tone: 'blue' },
		{ href: '/dashboard', label: 'Dashboard', icon: '⌂', tone: 'lime' }
	];

	const adminLink = { href: '/admin', label: 'Admin', icon: '⚙', tone: 'pink' };

	const links = $derived([
		...publicLinks,
		...(isAuthenticated ? memberLinks : []),
		...(isAdmin ? [adminLink] : [])
	]);
</script>

<nav class="app-navigation" aria-label="Primary">
	<ul>
		{#each links as link (link.href)}
			{@const active = page.url.pathname === link.href || page.url.pathname.startsWith(`${link.href}/`)}
			<li>
				<a
					href={link.href}
					class="app-nav-link"
					data-tone={link.tone}
					aria-label={link.label}
					aria-current={active ? 'page' : undefined}
					title={link.label}
				>
					<span class="app-nav-icon" aria-hidden="true">{link.icon}</span>
					<span class="app-nav-label">{link.label}</span>
				</a>
			</li>
		{/each}
	</ul>
</nav>

<style>
	.app-navigation {
		position: fixed;
		z-index: 45;
		inset: auto 0 0;
		display: flex;
		justify-content: center;
		border-top: 1px solid var(--color-divider);
		background: var(--color-nav-glass);
		padding: 0.55rem max(0.55rem, env(safe-area-inset-right)) calc(0.55rem + env(safe-area-inset-bottom)) max(0.55rem, env(safe-area-inset-left));
		backdrop-filter: blur(18px);
	}

	ul {
		display: flex;
		width: 100%;
		max-width: 42rem;
		align-items: stretch;
		justify-content: space-around;
		gap: 0.35rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		min-width: 0;
		flex: 1;
	}

	.app-nav-link {
		--nav-accent: var(--color-accent);
		display: flex;
		min-height: 3.6rem;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.2rem;
		border: 1px solid transparent;
		border-radius: 1rem;
		padding: 0.35rem 0.15rem;
		color: var(--color-muted);
		text-decoration: none;
		transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
	}

	.app-nav-link[data-tone='blue'] {
		--nav-accent: var(--color-pop-blue);
	}

	.app-nav-link[data-tone='pink'] {
		--nav-accent: var(--color-pop-pink);
	}

	.app-nav-link[data-tone='lilac'] {
		--nav-accent: var(--color-pop-lilac);
	}

	.app-nav-icon {
		display: grid;
		width: 1.65rem;
		height: 1.65rem;
		place-items: center;
		border-radius: 0.65rem;
		background: color-mix(in srgb, var(--nav-accent) 16%, transparent);
		color: var(--nav-accent);
		font-size: 1rem;
		line-height: 1;
	}

	.app-nav-link[aria-current='page'] {
		border-color: color-mix(in srgb, var(--nav-accent) 38%, transparent);
		background: color-mix(in srgb, var(--nav-accent) 13%, transparent);
		color: var(--color-foreground);
	}

	.app-nav-link[aria-current='page'] .app-nav-icon {
		background: var(--nav-accent);
		color: var(--color-background);
	}

	.app-nav-link:focus-visible {
		outline: 2px solid var(--nav-accent);
		outline-offset: 2px;
	}

	.app-nav-label {
		max-width: 100%;
		overflow: hidden;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.59rem;
		line-height: 1.2;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (min-width: 40rem) {
		.app-navigation {
			position: sticky;
			top: calc(4rem + env(safe-area-inset-top));
			align-self: start;
			overflow-y: auto;
			overscroll-behavior: contain;
			width: 4.5rem;
			height: calc(100dvh - 4rem - env(safe-area-inset-top));
			min-height: 0;
			justify-content: flex-start;
			border-top: 0;
			border-right: 1px solid var(--color-divider);
			padding: 1.2rem 0.4rem;
			backdrop-filter: none;
		}

		ul {
			flex-direction: column;
			justify-content: flex-start;
			gap: 0.7rem;
		}

		li {
			flex: none;
		}

		.app-nav-link {
			width: 3.7rem;
			min-height: 3.7rem;
			gap: 0;
			padding: 0.5rem 0.2rem;
		}

		.app-nav-label {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			white-space: nowrap;
			clip-path: inset(50%);
		}
	}

	@media (min-width: 64rem) {
		.app-navigation {
			width: 15rem;
			padding: 1.35rem 0.9rem;
		}

		ul {
			gap: 0.55rem;
		}

		.app-nav-link {
			width: 100%;
			min-height: 3.4rem;
			flex-direction: row;
			justify-content: flex-start;
			gap: 0.85rem;
			padding: 0.65rem 0.85rem;
		}

		.app-nav-icon {
			width: 1.85rem;
			height: 1.85rem;
		}

		.app-nav-label {
			position: static;
			width: auto;
			height: auto;
			clip: auto;
			clip-path: none;
			font-family: var(--font-sans);
			font-size: 0.9rem;
			white-space: normal;
		}
	}

	@media (hover: hover) and (pointer: fine) {
		.app-nav-link:hover:not([aria-current='page']) {
			border-color: color-mix(in srgb, var(--nav-accent) 24%, transparent);
			background: color-mix(in srgb, var(--nav-accent) 9%, transparent);
			color: var(--color-foreground);
		}
	}

	@media (hover: none) {
		.app-nav-link:hover:not([aria-current='page']) {
			background: transparent;
			color: var(--color-muted);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.app-nav-link {
			transition: none;
		}
	}
</style>
