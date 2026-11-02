<script lang="ts">
	import { page } from '$app/state';

	let { isAuthenticated, isAdmin }: { isAuthenticated: boolean; isAdmin: boolean } = $props();

	const publicLinks = [{ href: '/discover', label: 'Discover', icon: '✳' }];

	const memberLinks = [
		{ href: '/shop', label: 'Shop', icon: '◇' },
		{ href: '/spotlight', label: 'Spotlight', icon: '↗' },
		{ href: '/guild', label: 'My guild', icon: '◉' },
		{ href: '/dashboard', label: 'Dashboard', icon: '⌂' }
	];

	const adminLink = { href: '/admin', label: 'Admin', icon: '⚙' };

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
		border-top: 1px solid rgb(255 255 255 / 12%);
		background: rgb(17 18 16 / 94%);
		padding: 0.35rem max(0.35rem, env(safe-area-inset-right)) calc(0.35rem + env(safe-area-inset-bottom)) max(0.35rem, env(safe-area-inset-left));
		backdrop-filter: blur(16px);
	}

	ul {
		display: flex;
		width: 100%;
		max-width: 38rem;
		align-items: stretch;
		justify-content: space-around;
		gap: 0.15rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		min-width: 0;
		flex: 1;
	}

	.app-nav-link {
		display: flex;
		min-height: 3.5rem;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.1rem;
		border-radius: 0.9rem;
		padding: 0.35rem 0.1rem;
		color: #92958a;
		text-decoration: none;
		transition: background-color 150ms ease, color 150ms ease;
	}

	.app-nav-link:hover,
	.app-nav-link[aria-current='page'] {
		background: rgb(255 255 255 / 7%);
		color: #d5ff35;
	}

	.app-nav-link:focus-visible {
		outline: 2px solid #d5ff35;
		outline-offset: 2px;
	}

	.app-nav-icon {
		font-size: 1.05rem;
		line-height: 1.1;
	}

	.app-nav-label {
		max-width: 100%;
		overflow: hidden;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.57rem;
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
			border-right: 1px solid rgb(255 255 255 / 10%);
			padding: 1rem 0.4rem;
			backdrop-filter: none;
		}

		ul {
			flex-direction: column;
			justify-content: flex-start;
			gap: 0.5rem;
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
			padding: 1.25rem 0.75rem;
		}

		.app-nav-link {
			width: 100%;
			min-height: 3.25rem;
			flex-direction: row;
			justify-content: flex-start;
			gap: 0.8rem;
			padding: 0.7rem 0.9rem;
		}

		.app-nav-label {
			position: static;
			width: auto;
			height: auto;
			clip: auto;
			clip-path: none;
			font-family: var(--font-sans);
			font-size: 0.875rem;
			white-space: normal;
		}
	}

	@media (hover: none) {
		.app-nav-link:hover:not([aria-current='page']) {
			background: transparent;
			color: #92958a;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.app-nav-link {
			transition: none;
		}
	}
</style>
