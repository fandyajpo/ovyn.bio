import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// SvelteKit 3: configuration lives here, not in svelte.config.js.
export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			adapter: adapter({
				runtime: 'nodejs22',
				regions: ['iad1', 'sfo1', 'sin1'],
				maxDuration: 15
			})
		})
	]
});
