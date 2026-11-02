<script lang="ts">
	import { themeState, setTheme } from '#lib/theme.svelte.ts';

	const theme = themeState;
	const current = $derived(theme.value);

	function toggleTheme() {
		setTheme(current === 'dark' ? 'light' : 'dark');
	}
</script>

<button
	type="button"
	class="theme-toggle"
	onclick={toggleTheme}
	aria-label={current === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
	aria-pressed={current === 'light'}
	title={current === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
>
	<span aria-hidden="true">{current === 'dark' ? '☼' : '☾'}</span>
</button>

<style>
	.theme-toggle {
		display: grid;
		width: 2.75rem;
		height: 2.75rem;
		flex: 0 0 auto;
		place-items: center;
		border: 1px solid var(--color-divider);
		border-radius: 0.9rem;
		background: color-mix(in srgb, var(--color-pop-lilac) 12%, var(--color-surface));
		color: var(--color-pop-lilac);
		font-size: 1.15rem;
		transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
	}

	.theme-toggle:hover {
		border-color: color-mix(in srgb, var(--color-pop-lilac) 50%, transparent);
		background: color-mix(in srgb, var(--color-pop-lilac) 20%, var(--color-surface));
	}

	@media (prefers-reduced-motion: reduce) {
		.theme-toggle { transition: none; }
	}
</style>
