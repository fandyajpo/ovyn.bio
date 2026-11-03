import type { CreatureSetting } from '#lib/schemas/creatures';
import { creatureBounds, getCreatureArt, type CreatureArt } from './art';
import { CREATURE_PROFILES, type CreatureProfile, type FlightState } from './profiles';

export type Bounds = { width: number; height: number };

/** A local anchor a creature orbits, keeping preview groups compact. */
export type CreatureHome = { x: number; y: number; radius: number };

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
	/** When set, movement stays inside this small disc instead of the bounds. */
	home: CreatureHome | null;
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
		fit: 1,
		home: null
	};
}

/**
 * A scale that makes every species read at the same apparent size, measured
 * from its visible pixels rather than its canvas or wingspan.
 */
export function uniformCreatureScale(creature: Creature, target: number) {
	const bounds = creatureBounds(creature.art);
	return target / Math.max(1, Math.max(bounds.width, bounds.height));
}

/** Set the draw scale directly, storing it as the creature's fit multiplier. */
export function setCreatureScale(creature: Creature, scale: number) {
	creature.fit = scale / Math.max(0.01, creature.profile.scale * creature.setting.size);
}

/** Place a creature so its visible centre sits on the given point. */
export function centerCreature(creature: Creature, centerX: number, centerY: number, scale: number) {
	const bounds = creatureBounds(creature.art);
	const cx = (bounds.minX + bounds.maxX) / 2;
	const cy = (bounds.minY + bounds.maxY) / 2;
	const cos = Math.cos(creature.heading);
	const sin = Math.sin(creature.heading);
	creature.x = centerX - (cx * cos - cy * sin) * scale;
	creature.y = centerY - (cx * sin + cy * cos) * scale;
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
	// A preview creature has its own small home disc, so the whole flock stays
	// compact while each one still wanders.
	const minX = creature.home ? creature.home.x - creature.home.radius : margin;
	const maxX = creature.home ? creature.home.x + creature.home.radius : Math.max(margin, bounds.width - margin);
	const minY = creature.home ? creature.home.y - creature.home.radius : margin;
	const maxY = creature.home ? creature.home.y + creature.home.radius : Math.max(margin, bounds.height - margin);
	const bandX = creature.home ? Math.max(4, (maxX - minX) * 0.42) : Math.max(1, margin);
	const bandY = creature.home ? Math.max(4, (maxY - minY) * 0.42) : Math.max(1, margin);

	const steerX =
		creature.x < minX + bandX
			? (minX + bandX - creature.x) / bandX
			: creature.x > maxX - bandX
				? -(creature.x - (maxX - bandX)) / bandX
				: 0;
	const steerY =
		creature.y < minY + bandY
			? (minY + bandY - creature.y) / bandY
			: creature.y > maxY - bandY
				? -(creature.y - (maxY - bandY)) / bandY
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

	creature.x = clamp(creature.x, minX, Math.max(minX, maxX));
	creature.y = clamp(creature.y, minY, Math.max(minY, maxY));

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
