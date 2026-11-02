import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite-plus';

// SvelteKit 3: configuration lives here, not in svelte.config.js.
// Vite+ (vite-plus) drives dev, build and preview. SvelteKit and the plugins
// import `vite`, which the pnpm override in pnpm-workspace.yaml points at the
// Vite+ core, and Vite+ ships no test runner setup here because the project has
// no test suite.
export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			adapter: adapter({
				runtime: 'nodejs22.x',
				regions: ['iad1', 'sfo1', 'sin1'],
				maxDuration: 15
			})
		})
	]
});
