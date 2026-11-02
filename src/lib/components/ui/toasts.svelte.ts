import { browser } from '$app/env';

export type Toast = { id: number; kind: 'success' | 'error' | 'info'; message: string };

/** Module-level runes state - imported directly by <Toasts />. */
export const toasts = $state<Toast[]>([]);

let nextId = 1;

export function toast(kind: Toast['kind'], message: string) {
	if (!browser) return;
	const id = nextId++;
	toasts.push({ id, kind, message });
	setTimeout(() => dismiss(id), 4000);
}

export function dismiss(id: number) {
	const idx = toasts.findIndex((t) => t.id === id);
	if (idx !== -1) toasts.splice(idx, 1);
}
