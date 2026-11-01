<script lang="ts">
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import type { LayoutData } from './$types';
	import '../app.css';
	import Nav from '$lib/components/Nav.svelte';
	import Toasts from '$lib/components/ui/Toasts.svelte';

	let { data, children }: { data: LayoutData; children: any } = $props();

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: 1, refetchOnWindowFocus: false }
		}
	});
</script>

<QueryClientProvider client={queryClient}>
	<Nav user={data.user} />

	<main class="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
		{@render children()}
	</main>

	<footer class="border-t border-neutral-800/60 py-6 text-center text-xs text-neutral-600">
		OVYN — your identity. your circle.
	</footer>

	<Toasts />
</QueryClientProvider>
