export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'ovyn-theme';
const CHANNEL_NAME = 'ovyn-theme';

const THEME_COLOR: Record<Theme, string> = { dark: '#111117', light: '#faf7f4' };

let current = $state<Theme>('dark');
let started = false;
let channel: BroadcastChannel | null = null;

function isTheme(value: unknown): value is Theme {
	return value === 'light' || value === 'dark';
}

function readDocumentTheme(): Theme {
	if (typeof document === 'undefined') return 'dark';
	return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function applyTheme(next: Theme): void {
	if (typeof document === 'undefined') return;
	document.documentElement.dataset.theme = next;
	document.documentElement.style.colorScheme = next;
	document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[next]);
}

/** The theme every toggle on the page reads, kept in step across tabs. */
export const themeState = {
	get value(): Theme {
		return current;
	}
};

/**
 * Starts once from the root layout. A change in one tab reaches the others over
 * a BroadcastChannel, with the `storage` event as the fallback for browsers that
 * do not have one.
 */
export function startThemeSync(): void {
	if (started || typeof window === 'undefined') return;
	started = true;
	current = readDocumentTheme();

	try {
		channel = new BroadcastChannel(CHANNEL_NAME);
		channel.onmessage = (event: MessageEvent) => {
			const next = (event.data as { theme?: unknown } | null)?.theme;
			if (!isTheme(next) || next === current) return;
			current = next;
			applyTheme(next);
		};
	} catch {
		channel = null;
	}

	window.addEventListener('storage', (event) => {
		if (event.key !== STORAGE_KEY || !isTheme(event.newValue) || event.newValue === current) return;
		current = event.newValue;
		applyTheme(current);
	});
}

export function setTheme(next: Theme, persist = true): void {
	current = next;
	applyTheme(next);

	if (persist && typeof localStorage !== 'undefined') {
		try {
			localStorage.setItem(STORAGE_KEY, next);
		} catch {
			// The chosen theme still applies in this tab.
		}
	}

	channel?.postMessage({ theme: next });
}
