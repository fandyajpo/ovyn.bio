import type { CreatureSpecies } from '#lib/schemas/creatures';

export type FlightState = 'flying' | 'gliding' | 'hovering' | 'turning' | 'accelerating' | 'resting' | 'exploring';

export type CreatureProfile = {
	/** Art pixels to CSS pixels at size 1. */
	scale: number;
	/** Cruise speed range in CSS pixels per second. */
	speed: [number, number];
	glideSpeed: number;
	acceleration: number;
	/** Maximum turn rate in radians per second. */
	turnRate: number;
	/** Wingbeats per second. */
	wingRate: [number, number];
	/** How far a wing opens, from folded to full span. */
	wingRange: [number, number];
	bob: number;
	bank: number;
	weights: Partial<Record<FlightState, number>>;
};

// The butterfly is the flock: the landing monarch, at landing presence.
// Its sprite canvas spans ~224 art pixels when the wings spread, so the
// profile scale keeps it at the landing's ~134 px on-page wingspan at size 1.
export const CREATURE_PROFILES: Record<CreatureSpecies, CreatureProfile> = {
	butterfly: {
		scale: 0.6,
		speed: [16, 30],
		glideSpeed: 9,
		acceleration: 18,
		turnRate: 2.4,
		wingRate: [7, 10],
		wingRange: [0.22, 1],
		bob: 3.4,
		bank: 0.28,
		weights: { flying: 0.3, hovering: 0.22, exploring: 0.28, gliding: 0.1, resting: 0.1 }
	}
};
