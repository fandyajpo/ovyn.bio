import { z } from 'zod';

export const PROFILE_LINK_PROVIDER_IDS = [
	'snap', 'youtube', 'spotify', 'instagram', 'x', 'tiktok', 'telegram', 'soundcloud',
	'paypal', 'github', 'roblox', 'cashapp', 'venmo', 'playstation', 'xbox', 'apple_music',
	'gitlab', 'twitch', 'reddit', 'vk', 'tellonym', 'bluesky', 'namemc', 'onlyfans',
	'linkedin', 'steam', 'kick', 'pinterest', 'lastfm', 'statsfm', 'payhip',
	'buymeacoffee', 'kofi', 'facebook', 'threads', 'patreon', 'signal', 'bitcoin',
	'ethereum', 'litecoin', 'solana', 'xrp', 'monero', 'email', 'custom_url'
] as const;

export type ProfileLinkProvider = (typeof PROFILE_LINK_PROVIDER_IDS)[number];

export const PROFILE_LINK_PROVIDER_LABELS: Record<ProfileLinkProvider, string> = {
	snap: 'Snap',
	youtube: 'YouTube',
	spotify: 'Spotify',
	instagram: 'Instagram',
	x: 'X',
	tiktok: 'TikTok',
	telegram: 'Telegram',
	soundcloud: 'SoundCloud',
	paypal: 'PayPal',
	github: 'GitHub',
	roblox: 'Roblox',
	cashapp: 'Cash App',
	venmo: 'Venmo',
	playstation: 'PlayStation',
	xbox: 'Xbox',
	apple_music: 'Apple Music',
	gitlab: 'GitLab',
	twitch: 'Twitch',
	reddit: 'Reddit',
	vk: 'VK',
	tellonym: 'Tellonym',
	bluesky: 'Bluesky',
	namemc: 'NameMC',
	onlyfans: 'OnlyFans',
	linkedin: 'LinkedIn',
	steam: 'Steam',
	kick: 'Kick',
	pinterest: 'Pinterest',
	lastfm: 'Last.fm',
	statsfm: 'stats.fm',
	payhip: 'Payhip',
	buymeacoffee: 'Buy Me a Coffee',
	kofi: 'Ko-fi',
	facebook: 'Facebook',
	threads: 'Threads',
	patreon: 'Patreon',
	signal: 'Signal',
	bitcoin: 'Bitcoin',
	ethereum: 'Ethereum',
	litecoin: 'Litecoin',
	solana: 'Solana',
	xrp: 'XRP',
	monero: 'Monero',
	email: 'Email',
	custom_url: 'Custom URL'
};

export const profileLinkSchema = z
	.object({
		provider: z.enum(PROFILE_LINK_PROVIDER_IDS),
		url: z.string().trim().min(1, 'Enter a link or address').max(2048),
		label: z.string().trim().max(48).optional()
	})
	.superRefine((link, context) => {
		if (link.provider === 'custom_url' && !link.label) {
			context.addIssue({ code: 'custom', path: ['label'], message: 'Add a label for your custom link' });
		}
	});

export type ProfileLinkInput = z.infer<typeof profileLinkSchema>;

export const profileLinkIdSchema = z.object({ id: z.uuid() });
