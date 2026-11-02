import type { TemplateBlock } from '#lib/schemas/templates';

const CHANNEL_NAME = 'ovyn-template-preview';
const STORAGE_PREFIX = 'ovyn:template-preview:';
const PUBLISH_DEBOUNCE_MS = 240;

export type PreviewSnapshot = {
	key: string;
	blocks: TemplateBlock[];
	updatedAt: number;
};

type PreviewMessage = { type: 'state'; snapshot: PreviewSnapshot } | { type: 'request'; key: string };

function storageKey(key: string): string {
	return `${STORAGE_PREFIX}${key}`;
}

function isSnapshot(value: unknown, key: string): value is PreviewSnapshot {
	if (!value || typeof value !== 'object') return false;
	const snapshot = value as Partial<PreviewSnapshot>;
	return snapshot.key === key && Array.isArray(snapshot.blocks);
}

/** The last state this browser saw for a preview key. Works with no editor open. */
export function readPreviewSnapshot(key: string): PreviewSnapshot | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		const raw = localStorage.getItem(storageKey(key));
		if (!raw) return null;
		const parsed: unknown = JSON.parse(raw);
		return isSnapshot(parsed, key) ? parsed : null;
	} catch {
		return null;
	}
}

function writeSnapshot(snapshot: PreviewSnapshot): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(storageKey(snapshot.key), JSON.stringify(snapshot));
	} catch {
		// Storage can be full or blocked; the live channel still works.
	}
}

function openChannel(): BroadcastChannel | null {
	if (typeof BroadcastChannel === 'undefined') return null;
	try {
		return new BroadcastChannel(CHANNEL_NAME);
	} catch {
		return null;
	}
}

export type PreviewPublisher = {
	publish(blocks: TemplateBlock[], immediate?: boolean): void;
	dispose(): void;
};

/**
 * Publishes the editor's current blocks for one preview key: debounced over a
 * BroadcastChannel, with a localStorage snapshot as persistence and fallback.
 */
export function createPreviewPublisher(key: string): PreviewPublisher {
	const channel = openChannel();
	let timer: ReturnType<typeof setTimeout> | undefined;
	let pending: TemplateBlock[] | null = null;
	let disposed = false;

	function send(blocks: TemplateBlock[]): void {
		const snapshot: PreviewSnapshot = { key, blocks, updatedAt: Date.now() };
		writeSnapshot(snapshot);
		channel?.postMessage({ type: 'state', snapshot } satisfies PreviewMessage);
	}

	function onMessage(event: MessageEvent<PreviewMessage>): void {
		const message = event.data;
		if (!message || message.type !== 'request' || message.key !== key) return;
		const stored = readPreviewSnapshot(key);
		if (stored) send(stored.blocks);
	}

	channel?.addEventListener('message', onMessage);

	return {
		publish(blocks, immediate = false) {
			if (disposed) return;
			pending = blocks;
			if (timer) clearTimeout(timer);
			if (immediate) {
				timer = undefined;
				if (pending) send(pending);
				pending = null;
				return;
			}
			timer = setTimeout(() => {
				if (pending) send(pending);
				pending = null;
			}, PUBLISH_DEBOUNCE_MS);
		},
		dispose() {
			disposed = true;
			if (timer) clearTimeout(timer);
			channel?.removeEventListener('message', onMessage);
			channel?.close();
		}
	};
}

/**
 * Listens for one preview key. Reports the stored snapshot first so a preview
 * opened after the editor publishes something still has content, then asks any
 * open editor for its current state and follows live updates.
 */
export function subscribePreview(key: string, onSnapshot: (snapshot: PreviewSnapshot) => void): () => void {
	if (!key) return () => {};

	const channel = openChannel();
	const stored = readPreviewSnapshot(key);
	if (stored) onSnapshot(stored);

	function onMessage(event: MessageEvent<PreviewMessage>): void {
		const message = event.data;
		if (!message || message.type !== 'state') return;
		if (message.snapshot.key !== key) return;
		onSnapshot(message.snapshot);
	}

	channel?.addEventListener('message', onMessage);
	channel?.postMessage({ type: 'request', key } satisfies PreviewMessage);

	function onStorage(event: StorageEvent): void {
		if (event.key !== storageKey(key) || !event.newValue) return;
		try {
			const parsed: unknown = JSON.parse(event.newValue);
			if (isSnapshot(parsed, key)) onSnapshot(parsed);
		} catch {
			// Ignore malformed snapshots.
		}
	}

	window.addEventListener('storage', onStorage);

	return () => {
		channel?.removeEventListener('message', onMessage);
		channel?.close();
		window.removeEventListener('storage', onStorage);
	};
}

/** A preview key that ties one editor tab to its own preview tab. */
export function previewKeyFor(templateId: string, sessionId: string): string {
	return `${templateId}:${sessionId}`;
}
