import type { CreatureSetting } from '#lib/schemas/creatures';
import { getCreatureArt, type CreatureArt } from './art';
import { CREATURE_PROFILES, type CreatureProfile, type FlightState } from './profiles';

export type Bounds = { width: number; height: number };

export type Creature = {
	setting: CreatureSetting;
	profile: CreatureProfile;
	art: CreatureArt;
	x: number;
	y: number;
	heading: number;
	headingTarget: number;
	speed: number;
	speedTarget: number;
	state: FlightState;
	timer: number;
	flap: number;
	flapRate: number;
	bobPhase: number;
	bank: number;
	seed: number;
	time: number;
	/** Cruise speed the creature settles back to, in CSS pixels per second. */
	cruise: number;
	/** Responsive multiplier applied on top of the profile scale. */
	fit: number;
};

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

function angleDelta(a: number, b: number) {
	return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

function lerp(a: number, b: number, t: number) {
	return a + (b - a) * t;
}

function pickState(creature: Creature) {
	const entries = Object.entries(creature.profile.weights) as [FlightState, number][];
	const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
	let roll = Math.random() * total;

	let chosen: FlightState = 'flying';
	for (const [state, weight] of entries) {
		roll -= weight;
		if (roll <= 0) {
			chosen = state;
			break;
		}
	}

	creature.state = chosen;
	const calm = 1.2 - creature.setting.density * 0.5;
	switch (chosen) {
		case 'resting':
			creature.timer = (2 + Math.random() * 4) * calm;
			break;
		case 'hovering':
			creature.timer = (1.4 + Math.random() * 3) * calm;
			break;
		case 'gliding':
			creature.timer = (4 + Math.random() * 6) * calm;
			break;
		case 'accelerating':
			creature.timer = (1.6 + Math.random() * 2.6) * calm;
			break;
		case 'turning':
			creature.timer = (1.6 + Math.random() * 2.2) * calm;
			break;
		case 'exploring':
			creature.timer = (3 + Math.random() * 4) * calm;
			break;
		default:
			creature.timer = (3 + Math.random() * 5) * calm;
	}

	const spread =
		chosen === 'turning'
			? 1.5
			: chosen === 'exploring'
				? 0.95
				: chosen === 'accelerating'
					? 0.45
					: chosen === 'hovering' || chosen === 'resting'
						? 0.2
						: 0.35;
	creature.headingTarget += (Math.random() - 0.5) * spread;
}

function speedFor(creature: Creature, cruise: number) {
	switch (creature.state) {
		case 'resting':
			return cruise * 0.04;
		case 'hovering':
			return cruise * 0.08;
		case 'gliding':
			return creature.profile.glideSpeed;
		case 'accelerating':
			return cruise * 1.5;
		case 'turning':
			return cruise * 0.7;
		case 'exploring':
			return cruise * 0.55;
		default:
			return cruise;
	}
}

export function createCreature(
	setting: CreatureSetting,
	index: number,
	total: number,
	bounds: Bounds
): Creature | null {
	const profile = CREATURE_PROFILES[setting.id];
	const art = getCreatureArt(setting.id);
	if (!art) return null;

	const slot = (index + 0.5) / Math.max(1, total);
	const heading = Math.random() * Math.PI * 2;
	const cruise = lerp(profile.speed[0], profile.speed[1], Math.random()) * (0.7 + setting.intensity * 0.6);

	return {
		setting,
		profile,
		art,
		x: bounds.width * clamp(0.16 + slot * 0.68 + (Math.random() - 0.5) * 0.12, 0.1, 0.9),
		y: bounds.height * (0.18 + Math.random() * 0.64),
		heading,
		headingTarget: heading,
		speed: 0,
		speedTarget: cruise,
		state: 'flying',
		timer: 2 + Math.random() * 4,
		flap: Math.random() * Math.PI * 2,
		flapRate: lerp(profile.wingRate[0], profile.wingRate[1], Math.random()) * (0.6 + setting.density * 0.8),
		bobPhase: Math.random() * Math.PI * 2,
		bank: 0,
		seed: Math.random() * 100,
		time: Math.random() * 20,
		cruise,
		fit: 1
	};
}

/** Small still frame used by the creature picker thumbnails. */
export function createThumbCreature(setting: CreatureSetting): Creature | null {
	const creature = createCreature(setting, 0, 1, { width: 120, height: 80 });
	if (!creature) return null;
	creature.x = 60;
	creature.y = 42;
	creature.heading = -0.32;
	creature.flap = 0.9;
	creature.state = 'gliding';
	creature.bobPhase = 0.6;
	return creature;
}

export function updateCreature(creature: Creature, dt: number, bounds: Bounds, margin: number) {
	creature.time += dt;
	creature.timer -= dt;
	if (creature.timer <= 0) pickState(creature);

	creature.speedTarget = speedFor(creature, creature.cruise);
	creature.speed += clamp(
		creature.speedTarget - creature.speed,
		-creature.profile.acceleration * dt,
		creature.profile.acceleration * dt
	);

	// Edge awareness: bend towards the open middle well before the body arrives.
	const steerX =
		creature.x < margin
			? (margin - creature.x) / Math.max(1, margin)
			: creature.x > bounds.width - margin
				? -(creature.x - (bounds.width - margin)) / Math.max(1, margin)
				: 0;
	const steerY =
		creature.y < margin
			? (margin - creature.y) / Math.max(1, margin)
			: creature.y > bounds.height - margin
				? -(creature.y - (bounds.height - margin)) / Math.max(1, margin)
				: 0;

	let desired = creature.headingTarget;
	if (steerX !== 0 || steerY !== 0) {
		const inward = Math.atan2(steerY, steerX);
		const strength = clamp(Math.hypot(steerX, steerY) * 1.7, 0, 1);
		desired += angleDelta(inward, desired) * strength;
		if (strength > 0.4) creature.headingTarget = inward + (Math.random() - 0.5) * 0.5;
	}

	const wanderAmount = 0.32 + creature.setting.intensity * 0.55;
	const wander =
		(Math.sin(creature.time * 0.83 + creature.seed) + Math.sin(creature.time * 0.37 + creature.seed * 1.9) * 0.6) *
		wanderAmount;
	desired += wander;

	const delta = angleDelta(desired, creature.heading);
	const step = clamp(
		delta * Math.min(1, 2.4 * dt),
		-creature.profile.turnRate * dt,
		creature.profile.turnRate * dt
	);
	creature.heading += step;
	creature.bank += (clamp(step / Math.max(dt, 0.0001), -3, 3) - creature.bank) * Math.min(1, 5 * dt);

	creature.x += Math.cos(creature.heading) * creature.speed * dt;
	creature.y += Math.sin(creature.heading) * creature.speed * dt;

	creature.x = clamp(creature.x, margin, Math.max(margin, bounds.width - margin));
	creature.y = clamp(creature.y, margin, Math.max(margin, bounds.height - margin));

	const flapMultiplier =
		creature.state === 'gliding'
			? 0.25
			: creature.state === 'hovering'
				? 1.15
				: creature.state === 'accelerating'
					? 1.4
					: creature.state === 'resting'
						? 0.4
						: 1;
	creature.flap += dt * creature.flapRate * Math.PI * 2 * flapMultiplier;
	creature.bobPhase += dt * (0.9 + creature.setting.density * 1.2);
}

function drawWings(context: CanvasRenderingContext2D, creature: Creature, open: number) {
	const art = creature.art;
	if (!art.wing) return;

	const bank = clamp(creature.bank * 0.18, -0.4, 0.4);
	const right = clamp(open * (1 + bank), 0.05, 1.2);
	const left = clamp(open * (1 - bank), 0.05, 1.2);

	context.save();
	context.scale(1, right);
	context.drawImage(art.wing, art.hingeX - art.wingW / 2, art.hingeY);
	context.restore();

	context.save();
	context.scale(1, -left);
	context.drawImage(art.wing, art.hingeX - art.wingW / 2, art.hingeY);
	context.restore();
}

export function drawCreature(context: CanvasRenderingContext2D, creature: Creature, alpha = 1) {
	const art = creature.art;
	const scale = creature.profile.scale * creature.setting.size * creature.fit;
	const bob = Math.sin(creature.bobPhase) * creature.profile.bob * 0.4;
	const ghostPulse = Math.sin(creature.time * 0.9 + creature.seed) * 0.5 + 0.5;

	context.save();
	context.translate(creature.x, creature.y + bob);
	context.rotate(creature.heading);
	context.scale(scale, scale);

	if (art.glow) {
		const halo = context.createRadialGradient(0, 0, 2, 0, 0, 26);
		halo.addColorStop(0, `rgba(198, 194, 236, ${0.22 * alpha})`);
		halo.addColorStop(1, 'rgba(198, 194, 236, 0)');
		context.fillStyle = halo;
		context.beginPath();
		context.arc(0, 0, 26, 0, Math.PI * 2);
		context.fill();
	}

	context.globalAlpha = alpha * (art.glow ? art.alpha * (0.72 + ghostPulse * 0.28) : 1);

	if (art.tail) {
		const swing = Math.sin(creature.time * 1.6 + creature.seed) * 0.2;
		context.save();
		context.translate(art.tailX, art.tailY);
		context.rotate(swing);
		context.drawImage(art.tail, -art.tail.width, -art.tail.height / 2);
		context.restore();
	}

	const open = lerp(creature.profile.wingRange[0], creature.profile.wingRange[1], 0.5 + 0.5 * Math.cos(creature.flap));
	if (art.wing) drawWings(context, creature, open);

	context.drawImage(art.body, -art.bodyW / 2, -art.bodyH / 2);

	if (art.crest) {
		const sway = Math.sin(creature.time * 2.1 + creature.seed) * 0.14;
		context.save();
		context.translate(art.crestX, art.crestY);
		context.rotate(sway);
		context.drawImage(art.crest, -art.crest.width / 2, -art.crest.height);
		context.restore();
	}

	context.restore();
}
