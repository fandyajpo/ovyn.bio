<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';

	const preferenceKey = 'ovyn-push-preferences';
	const preferenceCache = 'ovyn-push-preferences-v1';
	const preferencePath = '/__ovyn_push_preferences__';

	const categories = [
		{ key: 'guild', label: 'Guild invitations and membership changes' },
		{ key: 'profile', label: 'Profile views and analytics' },
		{ key: 'shop', label: 'Shop purchases and payment updates' },
		{ key: 'referral', label: 'Referral and rewards activity' },
		{ key: 'announcements', label: 'General ovyn announcements' }
	] as const;

	type Category = (typeof categories)[number]['key'];
	type Preferences = Record<Category, boolean>;

	const defaultPreferences: Preferences = {
		guild: true,
		profile: true,
		shop: true,
		referral: true,
		announcements: true
	};

	let supported = $state(false);
	let enabled = $state(false);
	let permission = $state<NotificationPermission | 'unsupported'>('default');
	let preferences = $state<Preferences>({ ...defaultPreferences });
	let message = $state('Choose which ovyn updates this device may show.');
	let busy = $state(false);

	onMount(() => {
		void loadPreferences();
	});

	async function loadPreferences() {
		supported = 'Notification' in window && 'serviceWorker' in navigator;
		if (supported) permission = Notification.permission;

		try {
			const stored = localStorage.getItem(preferenceKey);
			if (stored) {
				const parsed = JSON.parse(stored) as { enabled?: unknown; categories?: Record<string, unknown> };
				enabled = parsed.enabled === true && permission === 'granted';
				for (const { key } of categories) {
					if (typeof parsed.categories?.[key] === 'boolean') {
						preferences[key] = parsed.categories[key] as boolean;
					}
				}
			}
		} catch {
			message = 'Could not read saved notification preferences.';
		}

		await savePreferences();
	}

	async function savePreferences() {
		const settings = { enabled, categories: { ...preferences } };
		try {
			localStorage.setItem(preferenceKey, JSON.stringify(settings));
		} catch {
			message = 'Browser storage is unavailable; preferences may not persist.';
		}

		try {
			if ('caches' in window) {
				const cache = await caches.open(preferenceCache);
				await cache.put(
					new Request(new URL(preferencePath, location.origin)),
					new Response(JSON.stringify(settings), { headers: { 'Content-Type': 'application/json' } })
				);
			}
		} catch {
			// Push delivery still respects the current browser permission.
		}
	}

	async function toggleNotifications() {
		if (!supported) {
			message = 'This browser does not support notifications.';
			return;
		}

		if (enabled) {
			enabled = false;
			message = 'ovyn notifications are paused on this device.';
			await savePreferences();
			return;
		}

		busy = true;
		try {
			permission = await Notification.requestPermission();
			if (permission !== 'granted') {
				enabled = false;
				message = permission === 'denied'
					? 'Notifications are blocked in your browser settings.'
					: 'Notification permission was not granted.';
				await savePreferences();
				return;
			}

			enabled = true;
			message = 'Browser permission is on. Your selected categories are saved on this device.';
			await savePreferences();
		} finally {
			busy = false;
		}
	}

	async function sendTestNotification() {
		if (!enabled || permission !== 'granted') return;
		const registration = await navigator.serviceWorker.getRegistration();
		if (!registration) {
			message = 'Install ovyn or open it over HTTPS to enable the service worker.';
			return;
		}
		await registration.showNotification('ovyn notifications are on', {
			body: 'Your browser can display ovyn updates on this device.',
			icon: '/icons/ovyn-192.svg',
			badge: '/icons/ovyn-192.svg',
			tag: 'ovyn-settings-test'
		});
		message = 'Test notification sent to this device.';
	}

	function toggleCategory(category: Category) {
		preferences[category] = !preferences[category];
		void savePreferences();
	}
</script>

<Card class="p-5 sm:p-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<span class="sticker sticker--blue">ovyn / device settings</span>
			<h2 class="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold">Push notifications</h2>
			<p class="mt-1 max-w-xl text-sm leading-6 text-neutral-400">Choose which ovyn updates this browser may surface. Notification permission is specific to this device.</p>
		</div>
		<Button type="button" variant={enabled ? 'secondary' : 'primary'} loading={busy} onclick={toggleNotifications}>
			{enabled ? 'Pause notifications' : 'Enable notifications'}
		</Button>
	</div>

	<div class="mt-5 grid gap-2 sm:grid-cols-2">
		{#each categories as category (category.key)}
			<label class="flex min-h-12 items-center gap-3 rounded-xl border border-neutral-800/60 bg-neutral-950/15 px-3 py-2 text-sm text-neutral-300 transition-colors hover:bg-neutral-900/35">
				<input
					type="checkbox"
					checked={preferences[category.key]}
					disabled={!enabled}
					onchange={() => toggleCategory(category.key)}
					class="size-4 shrink-0 accent-lime-300"
				/>
				<span>{category.label}</span>
			</label>
		{/each}
	</div>

	<div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800 pt-4">
		<p class="text-xs text-neutral-500" role="status">{message}</p>
		{#if enabled}<Button type="button" variant="ghost" onclick={sendTestNotification}>Send a test</Button>{/if}
	</div>
	<p class="mt-3 text-[11px] leading-5 text-neutral-600">Permission and category preferences are stored on this device, and the test is local. Remote push subscriptions and server delivery are not wired yet.</p>
</Card>
