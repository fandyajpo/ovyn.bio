<script lang="ts">
	import { onMount } from 'svelte';

	let theme = $state<'dark' | 'light'>('dark');

	function setTheme(next: 'dark' | 'light', persist = true) {
		theme = next;
		document.documentElement.dataset.theme = next;
		document.documentElement.style.colorScheme = next;
		document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'dark' ? '#16130f' : '#fff6e9');
		if (persist) {
			try {
				localStorage.setItem('ovyn-theme', next);
			} catch {
				// The selected theme still applies for this session.
			}
		}
	}

	onMount(() => {
		const current = document.documentElement.dataset.theme;
		setTheme(current === 'light' ? 'light' : 'dark', false);
	});

	function toggleTheme() {
		setTheme(theme === 'dark' ? 'light' : 'dark');
	}
</script>

<button
	type="button"
	class="theme-toggle"
	onclick={toggleTheme}
	aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
	aria-pressed={theme === 'light'}
	title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
>
	<span aria-hidden="true">{theme === 'dark' ? '☼' : '☾'}</span>
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
