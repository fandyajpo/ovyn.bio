import { z } from 'zod';
import {
	PROFILE_LINK_PROVIDER_IDS,
	PROFILE_LINK_PROVIDER_LABELS,
	type ProfileLinkProvider
} from './profile-links';

export const ONBOARDING_PERSONAS = [
	{ value: 'artist', label: 'Artist', description: 'you make things and want them seen', icon: '✦' },
	{
		value: 'content_creator',
		label: 'Content creator',
		description: 'you post everywhere and build an audience',
		icon: '◉'
	},
	{
		value: 'entrepreneur',
		label: 'Entrepreneur',
		description: 'you sell something and need a home for it',
		icon: '◇'
	},
	{ value: 'lone_wolf', label: 'Lone wolf', description: 'you keep it quiet and still want a corner', icon: '☾' },
	{ value: 'human', label: 'Human', description: 'you are here, and that is enough', icon: '☺' }
] as const;

export type OnboardingPersona = (typeof ONBOARDING_PERSONAS)[number]['value'];
export type OnboardingPersonaOption = (typeof ONBOARDING_PERSONAS)[number];

/** Providers that are not a place someone could have found ovyn. */
const NOT_A_SOURCE = new Set<string>(['email', 'custom_url', 'bitcoin', 'ethereum', 'litecoin', 'solana', 'xrp', 'monero']);

export type OnboardingSource = {
	value: string;
	label: string;
	provider: ProfileLinkProvider | null;
};

export const ONBOARDING_SOURCES: OnboardingSource[] = [
	...PROFILE_LINK_PROVIDER_IDS.filter((id) => !NOT_A_SOURCE.has(id)).map((id) => ({
		value: id,
		label: PROFILE_LINK_PROVIDER_LABELS[id],
		provider: id
	})),
	{ value: 'friend', label: 'A friend told me', provider: null },
	{ value: 'search', label: 'Search engine', provider: null },
	{ value: 'other', label: 'Somewhere else', provider: null }
];

const PERSONA_VALUES = ONBOARDING_PERSONAS.map((option) => option.value) as [
	OnboardingPersona,
	...OnboardingPersona[]
];

const SOURCE_VALUES = ONBOARDING_SOURCES.map((source) => source.value) as [string, ...string[]];

export const onboardingSchema = z.object({
	persona: z.enum(PERSONA_VALUES),
	foundVia: z.enum(SOURCE_VALUES)
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
