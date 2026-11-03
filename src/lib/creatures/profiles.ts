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

export const CREATURE_PROFILES: Record<CreatureSpecies, CreatureProfile> = {
	butterfly: {
		scale: 1.35,
		speed: [16, 30],
		glideSpeed: 9,
		acceleration: 18,
		turnRate: 2.4,
		wingRate: [7, 10],
		wingRange: [0.22, 1],
		bob: 3.4,
		bank: 0.28,
		weights: { flying: 0.3, hovering: 0.22, exploring: 0.28, gliding: 0.1, resting: 0.1 }
	},
	dragonfly: {
		scale: 1.4,
		speed: [46, 86],
		glideSpeed: 26,
		acceleration: 95,
		turnRate: 3.6,
		wingRate: [22, 30],
		wingRange: [0.5, 1],
		bob: 1.6,
		bank: 0.16,
		weights: { flying: 0.3, hovering: 0.2, accelerating: 0.2, exploring: 0.2, turning: 0.1 }
	},
	bat: {
		scale: 1.3,
		speed: [40, 70],
		glideSpeed: 24,
		acceleration: 60,
		turnRate: 3,
		wingRate: [6, 9],
		wingRange: [0.15, 1],
		bob: 2.5,
		bank: 0.5,
		weights: { flying: 0.35, exploring: 0.3, accelerating: 0.2, turning: 0.15 }
	},
	eagle: {
		scale: 1.15,
		speed: [26, 40],
		glideSpeed: 22,
		acceleration: 12,
		turnRate: 0.6,
		wingRate: [1.6, 2.4],
		wingRange: [0.55, 1],
		bob: 1.5,
		bank: 0.35,
		weights: { gliding: 0.45, flying: 0.2, exploring: 0.2, turning: 0.15 }
	},
	crow: {
		scale: 1.2,
		speed: [34, 55],
		glideSpeed: 20,
		acceleration: 30,
		turnRate: 1.6,
		wingRate: [4, 6],
		wingRange: [0.3, 1],
		bob: 1.2,
		bank: 0.3,
		weights: { flying: 0.35, gliding: 0.2, exploring: 0.25, turning: 0.2 }
	},
	parrot: {
		scale: 1.3,
		speed: [40, 65],
		glideSpeed: 22,
		acceleration: 45,
		turnRate: 2.6,
		wingRate: [8, 11],
		wingRange: [0.2, 1],
		bob: 1.8,
		bank: 0.35,
		weights: { flying: 0.3, accelerating: 0.25, exploring: 0.25, hovering: 0.1, turning: 0.1 }
	},
	cockatoo: {
		scale: 1.25,
		speed: [30, 50],
		glideSpeed: 16,
		acceleration: 28,
		turnRate: 1.8,
		wingRate: [5, 7],
		wingRange: [0.3, 1],
		bob: 2.2,
		bank: 0.4,
		weights: { flying: 0.3, gliding: 0.2, hovering: 0.15, exploring: 0.2, turning: 0.15 }
	},
	'flying-fish': {
		scale: 1.2,
		speed: [30, 50],
		glideSpeed: 26,
		acceleration: 22,
		turnRate: 0.9,
		wingRate: [2, 3.2],
		wingRange: [0.6, 1],
		bob: 1.4,
		bank: 0.2,
		weights: { gliding: 0.5, flying: 0.2, exploring: 0.2, turning: 0.1 }
	},
	'baby-dragon': {
		scale: 1.3,
		speed: [26, 45],
		glideSpeed: 15,
		acceleration: 30,
		turnRate: 2.2,
		wingRate: [4.5, 7],
		wingRange: [0.2, 1],
		bob: 2,
		bank: 0.45,
		weights: { flying: 0.3, hovering: 0.15, exploring: 0.25, accelerating: 0.2, turning: 0.1 }
	},
	pterosaur: {
		scale: 1.15,
		speed: [28, 46],
		glideSpeed: 22,
		acceleration: 18,
		turnRate: 0.9,
		wingRate: [2.2, 3.4],
		wingRange: [0.5, 1],
		bob: 1.6,
		bank: 0.3,
		weights: { gliding: 0.4, flying: 0.25, exploring: 0.2, turning: 0.15 }
	},
	quetzalcoatlus: {
		scale: 1,
		speed: [16, 28],
		glideSpeed: 12,
		acceleration: 8,
		turnRate: 0.45,
		wingRate: [1.1, 1.8],
		wingRange: [0.6, 1],
		bob: 1,
		bank: 0.2,
		weights: { gliding: 0.5, flying: 0.2, exploring: 0.2, turning: 0.1 }
	},
	ghost: {
		scale: 1.25,
		speed: [7, 16],
		glideSpeed: 4,
		acceleration: 4,
		turnRate: 0.35,
		wingRate: [0, 0],
		wingRange: [0, 0],
		bob: 6,
		bank: 0.15,
		weights: { hovering: 0.3, exploring: 0.3, resting: 0.2, flying: 0.2 }
	}
};
