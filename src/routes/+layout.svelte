<script lang="ts">
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import type { LayoutData } from './$types';
	import '../app.css';
	import Nav from '#lib/components/Nav.svelte';
	import FooterSurprise from '#lib/components/FooterSurprise.svelte';
	import Toasts from '#lib/components/ui/Toasts.svelte';

	let { data, children }: { data: LayoutData; children: any } = $props();

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: 1, refetchOnWindowFocus: false }
		}
	});
</script>

<QueryClientProvider client={queryClient}>
	<Nav user={data.user} isAdmin={data.isAdmin} />

	<main class="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
		{@render children()}
	</main>

	<footer class="mt-10 border-t border-neutral-800/70">
		<div class="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:grid-cols-[1fr_auto] sm:items-end">
			<div class="flex flex-col items-start gap-4">
				<span class="sticker sticker--dark">OVYN / INTERNET PERSONHOOD</span>
				<p class="max-w-sm font-[family-name:var(--font-display)] text-xl font-semibold text-neutral-200">Your identity, out in the world.<br /><span class="text-neutral-500">Your people, one link away.</span></p>
				<nav aria-label="Footer" class="flex flex-wrap gap-4 font-mono text-xs text-neutral-500">
					<a href="/discover" class="hover:text-lime-300">Discover</a>
					<a href="/shop" class="hover:text-lime-300">Shop</a>
					<a href={data.user ? '/dashboard' : '/login'} class="hover:text-lime-300">{data.user ? 'Your dashboard' : 'Claim your corner'}</a>
				</nav>
				<p class="font-mono text-[10px] uppercase tracking-widest text-neutral-700">OVYN — your identity. your circle.</p>
			</div>
			<FooterSurprise />
		</div>
	</footer>

	<Toasts />
</QueryClientProvider>
