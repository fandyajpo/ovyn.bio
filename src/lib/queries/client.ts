import { QueryClient } from '@tanstack/svelte-query';

/**
 * One QueryClient per browser tab, and one per server render. Nothing is shared
 * between requests or accounts, so a signed-in user's cached responses never
 * reach anyone else.
 */
export function createQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
				gcTime: 5 * 60_000,
				retry: 1,
				refetchOnWindowFocus: false,
				refetchOnReconnect: true
			},
			mutations: {
				retry: 0
			}
		}
	});
}
