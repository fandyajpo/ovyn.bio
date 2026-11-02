<script lang="ts">
	import { page } from '$app/state';
	import { signOut } from '#lib/auth-client';
	import Avatar from './ui/Avatar.svelte';
	import { toast } from './ui/toasts.svelte.ts';

	let { user, isAdmin }: { user: { name: string; image: string | null } | null; isAdmin: boolean } = $props();

	let menuOpen = $state(false);

	async function logout() {
		await signOut();
		toast('info', 'Signed out');
		location.href = '/';
	}

	const links = $derived(
		user
			? [
					{ href: '/discover', label: 'Discover' },
					{ href: '/shop', label: 'Shop' },
					{ href: '/spotlight', label: 'Spotlight' },
					{ href: '/guild', label: 'My Guild' },
					{ href: '/dashboard', label: 'Dashboard' }
				]
			: [
					{ href: '/discover', label: 'Discover' }
				]
	);
</script>

<header class="sticky top-0 z-40 border-b border-neutral-800/80 bg-[#111210]/90 backdrop-blur">
	<nav class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
		<a href="/" class="group flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
			<span class="grid size-8 rotate-[-6deg] place-items-center rounded-xl border-2 border-[#111210] bg-lime-300 font-mono text-sm text-neutral-950 shadow-[2px_2px_0_rgba(255,255,255,0.3)] transition-transform group-hover:rotate-6">O</span>
			<span>OVYN<span class="text-lime-300">.</span></span>
			<span class="sticker sticker--dark hidden sm:inline-flex">YOUR CORNER</span>
		</a>

		<div class="flex min-w-0 items-center gap-1 sm:gap-4">
			<div class="flex max-w-[48vw] items-center gap-1 overflow-x-auto whitespace-nowrap sm:max-w-none sm:gap-4 sm:overflow-visible">
				{#each links as link (link.href)}
					<a
						href={link.href}
						class="rounded-full px-3 py-1.5 text-sm text-neutral-400 transition-colors hover:bg-neutral-800/80 hover:text-neutral-100 data-[active=true]:bg-neutral-800 data-[active=true]:text-lime-300"
						data-active={page.url.pathname === link.href}
					>
						{link.label}
					</a>
				{/each}
			</div>

			{#if user}
				<div class="relative">
					<button
						type="button"
						onclick={() => (menuOpen = !menuOpen)}
						class="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-neutral-800"
						aria-haspopup="menu"
						aria-expanded={menuOpen}
					>
						<Avatar name={user.name} src={user.image} size="sm" />
					</button>

					{#if menuOpen}
						<button
							type="button"
							class="fixed inset-0 z-10 cursor-default"
							onclick={() => (menuOpen = false)}
							aria-label="Close menu"
						></button>
						<div
							role="menu"
							class="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 py-1 shadow-xl"
						>
							<a role="menuitem" href="/settings/profile" class="block px-4 py-2 text-sm text-neutral-300 transition-colors hover:bg-neutral-800">Profile settings</a>
							<a role="menuitem" href="/billing" class="block px-4 py-2 text-sm text-neutral-300 transition-colors hover:bg-neutral-800">Billing</a>
							{#if isAdmin}<a role="menuitem" href="/admin" class="block px-4 py-2 text-sm text-lime-300 transition-colors hover:bg-neutral-800">Monetization admin</a>{/if}
							<hr class="my-1 border-neutral-800" />
							<button role="menuitem" onclick={logout} class="block w-full px-4 py-2 text-left text-sm text-red-400 transition-colors hover:bg-neutral-800">
								Sign out
							</button>
						</div>
					{/if}
				</div>
			{:else}
				<a
					href="/login"
					class="rounded-lg bg-lime-300 px-4 py-1.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-lime-200"
				>
					Sign in
				</a>
			{/if}
		</div>
	</nav>
</header>
