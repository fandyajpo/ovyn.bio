import { browser } from '$app/env';

type Toast = { id: number; kind: 'success' | 'error' | 'info'; message: string };

let toasts = $state<Toast[]>([]);
let nextId = 1;

export function toast(kind: Toast['kind'], message: string) {
	const id = nextId++;
	toasts.push({ id, kind, message });
	setTimeout(() => dismiss(id), 4000);
}

export function dismiss(id: number) {
	toasts = toasts.filter((t) => t.id !== id);
}

export function toastState() {
	return {
		get list() {
			return toasts;
		}
	};
}

// Guard: this module is only imported from client components.
if (!browser) {
	toasts = [];
}
