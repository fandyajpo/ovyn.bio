<script lang="ts">
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

	function closeOnEscape(event: KeyboardEvent) {
		if (event.key === 'Escape') menuOpen = false;
	}
</script>

<svelte:window onkeydown={closeOnEscape} />

<header class="site-header sticky top-0 z-40 border-b border-neutral-800/80 bg-[#111210]/90 backdrop-blur">
	<div class="site-header-inner flex h-16 w-full items-center justify-between px-4">
		<a href="/" class="group flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
			<span class="grid size-8 rotate-[-6deg] place-items-center rounded-xl border-2 border-[#111210] bg-lime-300 font-mono text-sm text-neutral-950 shadow-[2px_2px_0_rgba(255,255,255,0.3)] transition-transform group-hover:rotate-6">O</span>
			<span>OVYN<span class="text-lime-300">.</span></span>
			<span class="sticker sticker--dark hidden sm:inline-flex">YOUR CORNER</span>
		</a>

		{#if user}
			<div class="relative">
				<button
					type="button"
					onclick={() => (menuOpen = !menuOpen)}
					class="flex min-h-11 items-center gap-2 rounded-full p-1 transition-colors hover:bg-neutral-800"
					aria-label={menuOpen ? 'Close account menu' : 'Open account menu'}
					aria-expanded={menuOpen}
					aria-controls="account-menu"
				>
					<Avatar name={user.name} src={user.image} size="sm" />
					<span class="hidden text-sm text-neutral-300 sm:inline">Account</span>
				</button>

				{#if menuOpen}
					<button
						type="button"
						class="fixed inset-0 z-10 cursor-default"
						onclick={() => (menuOpen = false)}
						aria-label="Close account menu"
					></button>
					<div
						id="account-menu"
						role="group"
						aria-label="Account links"
						class="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 py-1 shadow-xl"
					>
						<a href="/settings/profile" class="block min-h-11 px-4 py-3 text-sm text-neutral-300 transition-colors hover:bg-neutral-800">Profile settings</a>
						<a href="/billing" class="block min-h-11 px-4 py-3 text-sm text-neutral-300 transition-colors hover:bg-neutral-800">Billing</a>
						{#if isAdmin}<a href="/admin" class="block min-h-11 px-4 py-3 text-sm text-lime-300 transition-colors hover:bg-neutral-800">Monetization admin</a>{/if}
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
