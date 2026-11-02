<script lang="ts">
	import type { ProfileLinkProvider } from '#lib/schemas/profile-links';

	type Glyph =
		| 'link'
		| 'camera'
		| 'play'
		| 'send'
		| 'music'
		| 'chat'
		| 'mail'
		| 'coin'
		| 'gamepad'
		| 'code'
		| 'cart'
		| 'coffee'
		| 'users'
		| 'briefcase'
		| 'pin'
		| 'heart';

	const GLYPHS: Record<ProfileLinkProvider, { glyph: Glyph; color: string }> = {
		snap: { glyph: 'camera', color: '#E8C300' },
		youtube: { glyph: 'play', color: '#FF0033' },
		spotify: { glyph: 'music', color: '#1DB954' },
		instagram: { glyph: 'camera', color: '#E1306C' },
		x: { glyph: 'chat', color: '#7A7A85' },
		tiktok: { glyph: 'music', color: '#25C8C0' },
		telegram: { glyph: 'send', color: '#2AABEE' },
		soundcloud: { glyph: 'music', color: '#FF5500' },
		paypal: { glyph: 'cart', color: '#0070BA' },
		github: { glyph: 'code', color: '#8A8A96' },
		roblox: { glyph: 'gamepad', color: '#E2231A' },
		cashapp: { glyph: 'cart', color: '#00D54B' },
		venmo: { glyph: 'cart', color: '#008CFF' },
		playstation: { glyph: 'gamepad', color: '#0070D1' },
		xbox: { glyph: 'gamepad', color: '#107C10' },
		apple_music: { glyph: 'music', color: '#FA243C' },
		gitlab: { glyph: 'code', color: '#FC6D26' },
		twitch: { glyph: 'play', color: '#9146FF' },
		reddit: { glyph: 'chat', color: '#FF4500' },
		vk: { glyph: 'users', color: '#0077FF' },
		tellonym: { glyph: 'chat', color: '#E8481F' },
		bluesky: { glyph: 'send', color: '#1185FE' },
		namemc: { glyph: 'gamepad', color: '#63C56A' },
		onlyfans: { glyph: 'heart', color: '#00AFF0' },
		linkedin: { glyph: 'briefcase', color: '#0A66C2' },
		steam: { glyph: 'gamepad', color: '#3C7CA8' },
		kick: { glyph: 'play', color: '#53FC18' },
		pinterest: { glyph: 'pin', color: '#E60023' },
		lastfm: { glyph: 'music', color: '#D51007' },
		statsfm: { glyph: 'music', color: '#1ED760' },
		payhip: { glyph: 'cart', color: '#5C5CFF' },
		buymeacoffee: { glyph: 'coffee', color: '#E8C300' },
		kofi: { glyph: 'coffee', color: '#FF5E5B' },
		facebook: { glyph: 'users', color: '#1877F2' },
		threads: { glyph: 'chat', color: '#7A7A85' },
		patreon: { glyph: 'heart', color: '#FF424D' },
		signal: { glyph: 'chat', color: '#3A76F0' },
		bitcoin: { glyph: 'coin', color: '#F7931A' },
		ethereum: { glyph: 'coin', color: '#627EEA' },
		litecoin: { glyph: 'coin', color: '#5C7C9E' },
		solana: { glyph: 'coin', color: '#9945FF' },
		xrp: { glyph: 'coin', color: '#7A7A85' },
		monero: { glyph: 'coin', color: '#FF6600' },
		email: { glyph: 'mail', color: '#6E8BFF' },
		custom_url: { glyph: 'link', color: '#B06CFF' }
	};

	let { provider, size = 'md' }: { provider: string; size?: 'sm' | 'md' } = $props();

	const meta = $derived(GLYPHS[provider as ProfileLinkProvider] ?? { glyph: 'link' as Glyph, color: '#8C8C99' });
</script>

<span class="provider-icon provider-icon--{size}" style={`--provider-color: ${meta.color}`} aria-hidden="true">
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
		{#if meta.glyph === 'camera'}
			<rect x="3.4" y="6.9" width="17.2" height="12.4" rx="3.4" />
			<circle cx="12" cy="13.1" r="3.4" />
		{:else if meta.glyph === 'play'}
			<path d="M9.2 6.4 18.6 12l-9.4 5.6z" />
		{:else if meta.glyph === 'send'}
			<path d="M20.4 4.6 4.6 11.2l6.3 1.9 1.9 6.3z" />
			<path d="M20.4 4.6 11.9 12.4" />
		{:else if meta.glyph === 'music'}
			<path d="M9.6 17.4V6.7l8.4-1.8v10.7" />
			<circle cx="7.1" cy="17.6" r="2.4" />
			<circle cx="15.5" cy="15.6" r="2.4" />
		{:else if meta.glyph === 'chat'}
			<path d="M7.4 5.8h9.2a3.4 3.4 0 0 1 3.4 3.4v4.2a3.4 3.4 0 0 1-3.4 3.4h-4.9L7.6 20v-3.4A3.4 3.4 0 0 1 4 13.4V9.2a3.4 3.4 0 0 1 3.4-3.4z" />
		{:else if meta.glyph === 'mail'}
			<rect x="3.4" y="6.2" width="17.2" height="11.6" rx="3" />
			<path d="M4.8 8.6 12 13.6l7.2-5" />
		{:else if meta.glyph === 'coin'}
			<circle cx="12" cy="12" r="8" />
			<path d="M12 7.4v9.2" />
			<path d="M9.7 9.6h3.1a1.9 1.9 0 0 1 0 3.8H9.7" />
		{:else if meta.glyph === 'gamepad'}
			<rect x="2.8" y="8.2" width="18.4" height="9.4" rx="4.7" />
			<path d="M7.5 10.6v4.4M5.3 12.8h4.4" />
			<circle cx="16" cy="11.8" r="1" />
			<circle cx="18.3" cy="14" r="1" />
		{:else if meta.glyph === 'code'}
			<path d="M9.4 8.4 5 12l4.4 3.6" />
			<path d="M14.6 8.4 19 12l-4.4 3.6" />
		{:else if meta.glyph === 'cart'}
			<path d="M3.6 5.2h2.1l2.5 9.4h9.1l2.1-7.2H7.1" />
			<circle cx="9.6" cy="18.2" r="1.4" />
			<circle cx="16.6" cy="18.2" r="1.4" />
		{:else if meta.glyph === 'coffee'}
			<path d="M5.8 8.4h10.4v4.2a5.2 5.2 0 0 1-10.4 0z" />
			<path d="M16.2 9.6h1.5a2.4 2.4 0 0 1 0 4.8h-1.5" />
			<path d="M5 19.6h12.4" />
		{:else if meta.glyph === 'users'}
			<circle cx="10" cy="9.4" r="3.2" />
			<path d="M4.6 19.2a5.4 5.4 0 0 1 10.8 0" />
			<path d="M16 6.8a3 3 0 0 1 0 5.6" />
		{:else if meta.glyph === 'briefcase'}
			<rect x="3.4" y="8.4" width="17.2" height="10.4" rx="3" />
			<path d="M9.2 8.4V6.6h5.6v1.8" />
		{:else if meta.glyph === 'pin'}
			<path d="M12 20.2s5.9-5.2 5.9-9.5a5.9 5.9 0 1 0-11.8 0c0 4.3 5.9 9.5 5.9 9.5z" />
			<circle cx="12" cy="10.5" r="2.1" />
		{:else if meta.glyph === 'heart'}
			<path d="M12 19.4c-1.2-.9-7-4.6-7-9.2a3.9 3.9 0 0 1 7-2.3 3.9 3.9 0 0 1 7 2.3c0 4.6-5.8 8.3-7 9.2z" />
		{:else}
			<path d="M10.4 13.6a3.6 3.6 0 0 1 0-5.1l2.2-2.2a3.6 3.6 0 0 1 5.1 5.1l-1.1 1.1" />
			<path d="M13.6 10.4a3.6 3.6 0 0 1 0 5.1l-2.2 2.2a3.6 3.6 0 0 1-5.1-5.1l1.1-1.1" />
		{/if}
	</svg>
</span>

<style>
	.provider-icon {
		display: grid;
		flex: 0 0 auto;
		place-items: center;
		border: 1px solid color-mix(in srgb, var(--provider-color) 34%, transparent);
		border-radius: 0.65rem;
		background: color-mix(in srgb, var(--provider-color) 15%, transparent);
		color: color-mix(in srgb, var(--provider-color) 82%, var(--color-foreground));
	}

	.provider-icon svg { width: 62%; height: 62%; }
	.provider-icon--sm { width: 1.75rem; height: 1.75rem; border-radius: 0.55rem; }
	.provider-icon--md { width: 2.25rem; height: 2.25rem; }
</style>
