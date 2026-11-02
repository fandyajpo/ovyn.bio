/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { self } from '$app/service-worker';
import { version } from '$app/env';
import { assets, immutable } from '$app/manifest';
import { resolve } from '$app/paths';

const CACHE_NAME = `ovyn-shell-${version}`;
const PUSH_PREFERENCES_CACHE = 'ovyn-push-preferences-v1';
const PUSH_PREFERENCES_URL = new URL('/__ovyn_push_preferences__', self.location.origin).href;
const OFFLINE_URL = resolve('/offline.html');
const ASSET_URLS = [
	...immutable.map((asset) => resolve(asset.path)),
	...assets.map((asset) => resolve(asset.path))
];
const ASSET_PATHS = new Set(ASSET_URLS.map((asset) => new URL(asset, self.location.origin).pathname));

type PushMessage = {
	title?: string;
	body?: string;
	category?: string;
	url?: string;
	tag?: string;
};

type PushPreferences = {
	enabled: boolean;
	categories: Record<string, boolean>;
};

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_NAME);
			await cache.addAll(ASSET_URLS);
			await self.skipWaiting();
		})()
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const cacheNames = await caches.keys();
			await Promise.all(
				cacheNames
					.filter((name) => name.startsWith('ovyn-shell-') && name !== CACHE_NAME)
					.map((name) => caches.delete(name))
			);
			await self.clients.claim();
		})()
	);
});

self.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) ?? Response.error())
		);
		return;
	}

	if (!ASSET_PATHS.has(url.pathname)) return;

	event.respondWith(
		(async () => {
			const cached = await caches.match(request);
			if (cached) return cached;

			const response = await fetch(request);
			if (response.ok) {
				const cache = await caches.open(CACHE_NAME);
				await cache.put(request, response.clone());
			}
			return response;
		})()
	);
});

async function readPushPreferences(): Promise<PushPreferences | null> {
	const cache = await caches.open(PUSH_PREFERENCES_CACHE);
	const response = await cache.match(PUSH_PREFERENCES_URL);
	if (!response) return null;

	try {
		return (await response.json()) as PushPreferences;
	} catch {
		return null;
	}
}

self.addEventListener('push', (event) => {
	const rawMessage = event.data?.text() ?? '';
	let message: PushMessage = {};
	if (rawMessage) {
		try {
			message = JSON.parse(rawMessage) as PushMessage;
		} catch {
			message = { body: rawMessage };
		}
	}

	event.waitUntil(
		(async () => {
			const preferences = await readPushPreferences();
			if (!preferences?.enabled) return;
			if (message.category && preferences.categories?.[message.category] === false) return;

			await self.registration.showNotification(message.title ?? 'OVYN', {
				body: message.body ?? 'You have new activity. Open OVYN to see what changed.',
				icon: resolve('/icons/ovyn-192.svg'),
				badge: resolve('/icons/ovyn-192.svg'),
				tag: message.tag ?? `ovyn-${message.category ?? 'activity'}`,
				data: { url: message.url ?? '/dashboard' }
			});
		})()
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const requestedUrl = event.notification.data?.url;
	const target = new URL(typeof requestedUrl === 'string' ? requestedUrl : '/dashboard', self.location.origin);
	if (target.origin !== self.location.origin) target.pathname = '/dashboard';

	event.waitUntil(
		(async () => {
			const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
			for (const client of windows) {
				if ('focus' in client) {
					const windowClient = client as WindowClient;
					await windowClient.navigate(target.href);
					return windowClient.focus();
				}
			}
			return self.clients.openWindow(target.href);
		})()
	);
});
