<script lang="ts">
	import { page } from '$app/state';
	import { signOut } from '#lib/auth-client';
	import Avatar from './ui/Avatar.svelte';
	import { toast } from './ui/toasts.svelte';

	let { user }: { user: { name: string; image: string | null } | null } = $props();

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
		<a href="/" class="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
			OVYN<span class="text-lime-300">.</span>
		</a>

		<div class="flex items-center gap-1 sm:gap-4">
			{#each links as link (link.href)}
				<a
					href={link.href}
					class="rounded-md px-3 py-1.5 text-sm text-neutral-400 transition-colors hover:bg-neutral-800/60 hover:text-neutral-100 data-[active=true]:text-lime-300"
					data-active={page.url.pathname === link.href}
				>
					{link.label}
				</a>
			{/each}

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
