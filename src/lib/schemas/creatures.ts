import { z } from 'zod';

export const CREATURE_IDS = ['butterfly'] as const;

export type CreatureSpecies = (typeof CREATURE_IDS)[number];

export type CreatureGroup = 'insects' | 'animals' | 'fantasy';

export const CREATURE_CATALOG: readonly {
	id: CreatureSpecies;
	name: string;
	group: CreatureGroup;
	blurb: string;
}[] = [
	{ id: 'butterfly', name: 'Butterfly', group: 'insects', blurb: 'Drifts and hovers on slow, painted wings.' }
];

export const CREATURE_LIMIT = 1;

export const CREATURE_SIZE = { min: 0.6, max: 2.4, step: 0.05 } as const;

export const creatureSettingSchema = z.object({
	id: z.enum(CREATURE_IDS),
	enabled: z.boolean().default(true),
	size: z.number().min(CREATURE_SIZE.min).max(CREATURE_SIZE.max).default(1),
	/** How far and how fast it explores, from calm to busy. */
	intensity: z.number().min(0).max(1).default(0.55),
	/** Wingbeat and behaviour change frequency. */
	density: z.number().min(0).max(1).default(0.6)
});

export const creatureConfigSchema = z.object({
	version: z.literal(1),
	list: z.array(creatureSettingSchema).max(CREATURE_LIMIT)
});

export type CreatureSetting = z.infer<typeof creatureSettingSchema>;
export type CreatureConfig = z.infer<typeof creatureConfigSchema>;

export const EMPTY_CREATURE_CONFIG: CreatureConfig = { version: 1, list: [] };

export function creatureName(id: CreatureSpecies) {
	return CREATURE_CATALOG.find((entry) => entry.id === id)?.name ?? id;
}

export function defaultCreatureSetting(id: CreatureSpecies): CreatureSetting {
	return { id, enabled: true, size: 1, intensity: 0.55, density: 0.6 };
}

/** Stored JSON is trusted only after it passes the schema and de-duplicates ids. */
export function parseCreatureConfig(value: unknown): CreatureConfig {
	const parsed = creatureConfigSchema.safeParse(value);
	if (!parsed.success) return { version: 1, list: [] };

	const seen = new Set<string>();
	const list = parsed.data.list.filter((item) => {
		if (seen.has(item.id)) return false;
		seen.add(item.id);
		return true;
	});

	return { version: 1, list };
}
