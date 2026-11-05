import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite-plus';

// SvelteKit 3: configuration lives here, not in svelte.config.js.
// Vite+ (vite-plus) drives dev, build and preview, and its bundled vitest
// runner picks this config up for the starter suite in src/lib/**/*.test.ts.
export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			adapter: adapter({
				runtime: 'nodejs22.x',
				// One function region only: listing several (multi-region failover)
				// needs Vercel Pro, and Hobby deployments fail with "upgrade_required"
				// at the patchBuild step. sin1 (Singapore) is the closest region to
				// Indonesia and the Neon database.
				regions: ['sin1'],
				maxDuration: 15
			})
		})
	]
});
