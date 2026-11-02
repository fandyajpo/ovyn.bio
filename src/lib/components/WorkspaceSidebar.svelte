<script lang="ts">
	import { page } from '$app/state';

	let { profileSlug, planTier }: { profileSlug: string; planTier: 'free' | 'premium' } = $props();
	let shareMessage = $state('Share your profile');

	const accountLinks = [
		{ href: '/account', label: 'Overview' },
		{ href: '/dashboard', label: 'Activity dashboard' },
		{ href: '/account/analytics', label: 'Analytics' },
		{ href: '/account/badges', label: 'Badges' },
		{ href: '/account/settings', label: 'Account settings' }
	];
	const creatorLinks = [
		{ href: '/settings/profile', label: 'Profile details' },
		{ href: '/customize', label: 'Customize page' },
		{ href: '/links', label: 'Social links' },
		{ href: '/upgrade', label: 'Plans & upgrade' },
		{ href: '/templates', label: 'Templates' },
		{ href: '/help', label: 'Help center' }
	];

	function isActive(href: string) {
		return href === '/account'
			? page.url.pathname === href
			: page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
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
</script>

<aside class="workspace-sidebar rounded-2xl border border-white/10 bg-neutral-950/70 p-4 sm:p-5" aria-label="Account workspace">
	<div class="mb-4 flex items-center justify-between gap-3 lg:block">
		<div>
			<span class="sticker sticker--pink">YOUR SPACE</span>
			<p class="mt-3 font-[family-name:var(--font-display)] text-lg font-semibold">Account menu</p>
		</div>
		<span class="rounded-full border border-lime-300/30 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider {planTier === 'premium' ? 'text-lime-300' : 'text-neutral-400'}">
			{planTier}
		</span>
	</div>

	<nav class="grid gap-x-2 gap-y-4 sm:grid-cols-2 lg:grid-cols-1" aria-label="Workspace navigation">
		<section class="grid content-start gap-1">
			<h2 class="px-3 pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">Account</h2>
			{#each accountLinks as link (link.href)}
				<a href={link.href} aria-current={isActive(link.href) ? 'page' : undefined} class="workspace-link">{link.label}</a>
			{/each}
		</section>
		<section class="grid content-start gap-1">
			<h2 class="px-3 pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">Creator tools</h2>
			{#each creatorLinks as link (link.href)}
				<a href={link.href} aria-current={isActive(link.href) ? 'page' : undefined} class="workspace-link">{link.label}</a>
			{/each}
			<a href="/{profileSlug}" target="_blank" rel="noreferrer" class="workspace-link">My public page ↗</a>
		</section>
	</nav>

	<button type="button" class="mt-4 min-h-11 w-full rounded-xl border border-neutral-700 px-3 text-left text-sm text-neutral-300 transition hover:border-lime-300/40 hover:text-lime-300" onclick={shareProfile}>
		{shareMessage}
	</button>
</aside>

<style>
	.workspace-sidebar {
		box-shadow: 3px 3px 0 rgb(131 230 255 / 10%);
	}

	.workspace-link {
		display: flex;
		min-height: 2.65rem;
		align-items: center;
		border: 1px solid transparent;
		border-radius: 0.75rem;
		padding: 0.55rem 0.75rem;
		color: var(--color-muted);
		font-size: 0.875rem;
		text-decoration: none;
		transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
	}

	.workspace-link:hover,
	.workspace-link[aria-current='page'] {
		border-color: color-mix(in srgb, var(--color-accent) 28%, transparent);
		background: color-mix(in srgb, var(--color-accent) 9%, transparent);
		color: var(--color-foreground);
	}

	@media (min-width: 64rem) {
		.workspace-sidebar {
			position: sticky;
			top: 5.5rem;
			align-self: start;
		}
	}
</style>
