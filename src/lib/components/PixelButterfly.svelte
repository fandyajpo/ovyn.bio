<script lang="ts">
	import { onMount } from 'svelte';

	type Rgb = readonly [number, number, number];

	const WING_W = 40;
	const WING_H = 56;
	const HINGE_Y = 28;
	const BODY_W = 30;
	const BODY_H = 64;
	const BODY_ANCHOR = 30;

	const INK: Rgb = [34, 22, 12];
	const WING_DARK: Rgb = [154, 64, 24];
	const WING_MID: Rgb = [214, 104, 40];
	const WING_LIGHT: Rgb = [244, 146, 66];
	const WING_PALE: Rgb = [255, 186, 112];
	const SPOT: Rgb = [255, 232, 190];
	const BODY: Rgb = [62, 40, 22];
	const BODY_DARK: Rgb = [38, 24, 14];
	const BODY_LIGHT: Rgb = [112, 74, 40];

	const VEIN_ANGLES = [-1.15, -0.85, -0.55, -0.28, 0.02, 0.32, 0.62];
	const SPOTS: Array<[number, number]> = [
		[20, -0.95],
		[22, -0.62],
		[18, -1.18],
		[15, 0.38],
		[18, 0.66],
		[11, -0.18]
	];

	function css(colour: Rgb) {
		return `rgb(${colour[0]} ${colour[1]} ${colour[2]})`;
	}

	function shade(colour: Rgb, factor: number): Rgb {
		return [
			Math.round(colour[0] * factor),
			Math.round(colour[1] * factor),
			Math.round(colour[2] * factor)
		];
	}

	/** Deterministic value noise, so the wing texture is stable between builds. */
	function hash(x: number, y: number) {
		const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
		return value - Math.floor(value);
	}

	function angleDelta(a: number, b: number) {
		return Math.atan2(Math.sin(a - b), Math.cos(a - b));
	}

	function ellipseScore(x: number, y: number, cx: number, cy: number, rx: number, ry: number, rotation: number) {
		const cos = Math.cos(rotation);
		const sin = Math.sin(rotation);
		const dx = x - cx;
		const dy = y - cy;
		const u = dx * cos + dy * sin;
		const v = -dx * sin + dy * cos;
		return (u * u) / (rx * rx) + (v * v) / (ry * ry);
	}

	function insideWing(x: number, y: number) {
		return (
			ellipseScore(x, y, 17, -12, 20, 12, -0.4) <= 1 || ellipseScore(x, y, 12, 6, 15, 11, 0.3) <= 1
		);
	}

	/** Colour of one pixel of the right wing, in local wing coordinates. */
	function sampleWing(x: number, y: number): Rgb | null {
		if (!insideWing(x, y)) return null;

		const edge =
			!insideWing(x - 1, y) || !insideWing(x + 1, y) || !insideWing(x, y - 1) || !insideWing(x, y + 1);
		if (edge) return INK;

		const radius = Math.hypot(x, y);
		const angle = Math.atan2(y, x);
		const fore = ellipseScore(x, y, 17, -12, 20, 12, -0.4);
		const hind = ellipseScore(x, y, 12, 6, 15, 11, 0.3);

		let base: Rgb = radius < 9 ? WING_DARK : radius < 17 ? WING_MID : WING_LIGHT;

		// Veins radiate from the hinge, fanning across both wings.
		if (radius > 5 && VEIN_ANGLES.some((candidate) => Math.abs(angleDelta(angle, candidate)) < 0.028)) {
			return shade(INK, 1.15);
		}

		// Concentric scale bands give the wing its layered texture.
		const band = (radius - 6) % 6.5;
		if (radius > 8 && band >= 0 && band < 0.6) base = shade(base, 0.84);

		// Cream spots near the wing edge.
		for (const [spotRadius, spotAngle] of SPOTS) {
			if (Math.abs(radius - spotRadius) < 1.4 && Math.abs(angleDelta(angle, spotAngle)) < 0.1) {
				return SPOT;
			}
		}

		if (hind <= 1 && fore > 1) base = shade(base, 0.92);
		if (y < -4 && hash(x, y) > 0.87) base = WING_PALE;
		if (radius > 23 && hash(x, y) > 0.55) base = shade(base, 1.12);
		if (hash(x, y) > 0.94) base = shade(base, 0.9);

		return base;
	}

	function buildRightWing(): HTMLCanvasElement | null {
		const canvas = document.createElement('canvas');
		canvas.width = WING_W;
		canvas.height = WING_H;
		const context = canvas.getContext('2d');
		if (!context) return null;

		const image = context.createImageData(WING_W, WING_H);
		for (let py = 0; py < WING_H; py += 1) {
			for (let px = 0; px < WING_W; px += 1) {
				const colour = sampleWing(px + 0.5, py + 0.5 - HINGE_Y);
				if (!colour) continue;
				const index = (py * WING_W + px) * 4;
				image.data[index] = colour[0];
				image.data[index + 1] = colour[1];
				image.data[index + 2] = colour[2];
				image.data[index + 3] = 255;
			}
		}

		context.putImageData(image, 0, 0);
		return canvas;
	}

	function buildLeftWing(right: HTMLCanvasElement): HTMLCanvasElement | null {
		const canvas = document.createElement('canvas');
		canvas.width = WING_W;
		canvas.height = WING_H;
		const context = canvas.getContext('2d');
		if (!context) return null;
		context.translate(WING_W, 0);
		context.scale(-1, 1);
		context.drawImage(right, 0, 0);
		return canvas;
	}

	function buildBody(): HTMLCanvasElement | null {
		const canvas = document.createElement('canvas');
		canvas.width = BODY_W;
		canvas.height = BODY_H;
		const context = canvas.getContext('2d');
		if (!context) return null;

		const paint = (x: number, y: number, colour: Rgb) => {
			context.fillStyle = css(colour);
			context.fillRect(Math.round(x), Math.round(y), 1, 1);
		};

		const line = (x0: number, y0: number, x1: number, y1: number, colour: Rgb) => {
			const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
			for (let step = 0; step <= steps; step += 1) {
				const t = steps === 0 ? 0 : step / steps;
				paint(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, colour);
			}
		};

		const centre = Math.floor(BODY_W / 2);

		// Abdomen: tapering segments with visible rings.
		for (let y = 38; y <= 56; y += 1) {
			const t = (y - 38) / 18;
			const half = Math.max(1, Math.round(4 - t * 2.6));
			for (let x = centre - half; x <= centre + half; x += 1) {
				const rim = x === centre - half || x === centre + half || y === 56;
				paint(x, y, rim ? BODY_DARK : y % 4 === 0 ? BODY_LIGHT : BODY);
			}
		}

		// Thorax: the fuzzy middle the wings attach to.
		for (let y = 26; y <= 38; y += 1) {
			const half = y < 29 || y > 35 ? 4 : 5;
			for (let x = centre - half; x <= centre + half; x += 1) {
				const rim = x === centre - half || x === centre + half;
				paint(x, y, rim ? BODY_DARK : hash(x, y) > 0.7 ? BODY_LIGHT : BODY);
			}
		}

		// Head and compound eyes.
		for (let y = 17; y <= 26; y += 1) {
			const half = y < 19 || y > 24 ? 2 : 4;
			for (let x = centre - half; x <= centre + half; x += 1) {
				paint(x, y, x === centre - half || x === centre + half ? BODY_DARK : BODY);
			}
		}
		paint(centre - 2, 20, SPOT);
		paint(centre + 2, 20, SPOT);
		paint(centre - 2, 21, BODY_DARK);
		paint(centre + 2, 21, BODY_DARK);

		// Antennae: two segments each, curving outward.
		line(centre - 1, 18, centre - 4, 11, BODY_DARK);
		line(centre - 4, 11, centre - 9, 6, BODY_DARK);
		line(centre + 1, 18, centre + 4, 11, BODY_DARK);
		line(centre + 4, 11, centre + 9, 6, BODY_DARK);

		// Six delicate legs.
		line(centre - 4, 29, centre - 9, 35, BODY_DARK);
		line(centre - 5, 33, centre - 10, 41, BODY_DARK);
		line(centre - 4, 37, centre - 8, 45, BODY_DARK);
		line(centre + 4, 29, centre + 9, 35, BODY_DARK);
		line(centre + 5, 33, centre + 10, 41, BODY_DARK);
		line(centre + 4, 37, centre + 8, 45, BODY_DARK);

		return canvas;
	}

	type Sprite = {
		right: HTMLCanvasElement;
		left: HTMLCanvasElement;
		body: HTMLCanvasElement;
	};

	function buildSprite(): Sprite | null {
		const right = buildRightWing();
		if (!right) return null;
		const left = buildLeftWing(right);
		const body = buildBody();
		if (!left || !body) return null;
		return { right, left, body };
	}

	type Mode = 'cruise' | 'hover' | 'dart';
	type Vec = { x: number; y: number };

	type Motion = {
		pos: Vec;
		vel: Vec;
		target: Vec;
		heading: number;
		mode: Mode;
		modeTimer: number;
		flapPhase: number;
		flapRate: number;
		seed: number;
		time: number;
	};

	function clamp(value: number, min: number, max: number) {
		return Math.min(Math.max(value, min), max);
	}

	function createMotion(width: number, height: number): Motion {
		return {
			pos: { x: width * 0.46, y: height * 0.42 },
			vel: { x: 18, y: -6 },
			target: { x: width * 0.7, y: height * 0.3 },
			heading: Math.PI / 2,
			mode: 'cruise',
			modeTimer: 1.5,
			flapPhase: Math.random() * Math.PI * 2,
			flapRate: 9,
			seed: Math.random() * 1000,
			time: Math.random() * 10
		};
	}

	function pickTarget(from: Vec, width: number, height: number, minimum: number): Vec {
		const margin = 64;
		const maxX = Math.max(margin, width - margin);
		const maxY = Math.max(margin, height - margin);
		let next = { x: from.x, y: from.y };
		for (let attempt = 0; attempt < 9; attempt += 1) {
			next = {
				x: margin + Math.random() * (maxX - margin),
				y: margin + Math.random() * (maxY - margin)
			};
			if (Math.hypot(next.x - from.x, next.y - from.y) >= minimum) break;
		}
		return next;
	}

	function pickBehaviour(motion: Motion, width: number, height: number) {
		const roll = Math.random();
		motion.mode = roll < 0.18 ? 'dart' : roll < 0.42 ? 'hover' : 'cruise';
		motion.modeTimer = 2 + Math.random() * 4;

		if (motion.mode === 'hover') {
			motion.modeTimer = 1.4 + Math.random() * 2.4;
			motion.target = {
				x: clamp(motion.pos.x + (Math.random() - 0.5) * 90, 64, Math.max(64, width - 64)),
				y: clamp(motion.pos.y + (Math.random() - 0.5) * 90, 64, Math.max(64, height - 64))
			};
			motion.flapRate = 12.5;
			return;
		}

		motion.flapRate = motion.mode === 'dart' ? 11 : 8.6 + Math.random() * 1.8;
		motion.target = pickTarget(motion.pos, width, height, motion.mode === 'dart' ? 190 : 110);
	}

	function approachAngle(current: number, target: number, factor: number) {
		const delta = angleDelta(target, current);
		return current + delta * Math.min(1, factor);
	}

	function updateMotion(motion: Motion, dt: number, width: number, height: number) {
		motion.time += dt;
		motion.modeTimer -= dt;

		const targetDx = motion.target.x - motion.pos.x;
		const targetDy = motion.target.y - motion.pos.y;
		const targetDistance = Math.hypot(targetDx, targetDy);

		if (motion.modeTimer <= 0) {
			pickBehaviour(motion, width, height);
		} else if (targetDistance < 26 && motion.mode !== 'hover') {
			motion.target = pickTarget(motion.pos, width, height, 110);
		}

		const desiredSpeed = motion.mode === 'hover' ? 0 : motion.mode === 'dart' ? 185 : 96;
		const dx = motion.target.x - motion.pos.x;
		const dy = motion.target.y - motion.pos.y;
		const distance = Math.hypot(dx, dy) || 1;
		const desiredX = (dx / distance) * desiredSpeed;
		const desiredY = (dy / distance) * desiredSpeed;

		const agility = motion.mode === 'dart' ? 3.2 : motion.mode === 'hover' ? 2.4 : 1.8;
		const blend = Math.min(1, agility * dt);
		motion.vel.x += (desiredX - motion.vel.x) * blend;
		motion.vel.y += (desiredY - motion.vel.y) * blend;

		// Two slow noise bands keep the path wandering instead of pointing.
		const wobble =
			(Math.sin(motion.time * 1.31 + motion.seed) + Math.sin(motion.time * 0.47 + motion.seed * 2.1)) * 16;
		motion.vel.x += Math.cos(motion.time * 0.83 + motion.seed) * wobble * dt;
		motion.vel.y += Math.sin(motion.time * 0.61 + motion.seed * 1.7) * wobble * dt;

		// Steer away from the edges well before touching them.
		const edge = 92;
		const push = 230;
		if (motion.pos.x < edge) motion.vel.x += ((edge - motion.pos.x) / edge) * push * dt;
		if (motion.pos.x > width - edge) motion.vel.x -= ((motion.pos.x - (width - edge)) / edge) * push * dt;
		if (motion.pos.y < edge) motion.vel.y += ((edge - motion.pos.y) / edge) * push * dt;
		if (motion.pos.y > height - edge) motion.vel.y -= ((motion.pos.y - (height - edge)) / edge) * push * dt;

		const speed = Math.hypot(motion.vel.x, motion.vel.y);
		const limit = motion.mode === 'dart' ? 215 : 132;
		if (speed > limit) {
			motion.vel.x = (motion.vel.x / speed) * limit;
			motion.vel.y = (motion.vel.y / speed) * limit;
		}

		motion.pos.x = clamp(motion.pos.x + motion.vel.x * dt, 54, Math.max(54, width - 54));
		motion.pos.y = clamp(motion.pos.y + motion.vel.y * dt, 54, Math.max(54, height - 54));

		if (speed > 9) {
			motion.heading = approachAngle(motion.heading, Math.atan2(motion.vel.y, motion.vel.x), 4 * dt);
		}

		motion.flapPhase += dt * motion.flapRate * Math.PI * 2;
	}

	function drawButterfly(
		context: CanvasRenderingContext2D,
		sprite: Sprite,
		motion: Motion,
		width: number,
		height: number,
		scale: number
	) {
		context.clearRect(0, 0, width, height);

		const beat = Math.cos(motion.flapPhase);
		const open = 0.24 + 0.76 * (0.5 + 0.5 * beat);
		const profile = 0.84 + 0.16 * (0.5 + 0.5 * beat);
		const lift = (1 - open) * -2.4;

		context.save();
		context.translate(motion.pos.x, motion.pos.y + lift);
		context.rotate(motion.heading + Math.PI / 2);
		context.scale(scale, scale);

		context.save();
		context.scale(open, profile);
		context.drawImage(sprite.left, -WING_W, -HINGE_Y);
		context.restore();

		context.save();
		context.scale(open, profile);
		context.drawImage(sprite.right, 0, -HINGE_Y);
		context.restore();

		context.drawImage(sprite.body, -BODY_W / 2, -BODY_ANCHOR);
		context.restore();
	}

	let host = $state<HTMLDivElement | undefined>(undefined);
	let canvas = $state<HTMLCanvasElement | undefined>(undefined);

	onMount(() => {
		const surface = canvas;
		const stage = host;
		if (!surface || !stage) return;

		const context = surface.getContext('2d');
		const sprite = buildSprite();
		if (!context || !sprite) return;

		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		let reduced = media.matches;
		let width = 0;
		let height = 0;
		let frame = 0;
		let running = false;
		let visible = false;
		let last = 0;
		let motion = createMotion(320, 420);

		const resize = () => {
			const rect = stage.getBoundingClientRect();
			width = Math.max(1, Math.round(rect.width));
			height = Math.max(1, Math.round(rect.height));
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			surface.width = Math.round(width * dpr);
			surface.height = Math.round(height * dpr);
			surface.style.width = `${width}px`;
			surface.style.height = `${height}px`;
			context.setTransform(dpr, 0, 0, dpr, 0, 0);
			context.imageSmoothingEnabled = false;

			motion.pos.x = clamp(motion.pos.x, 54, Math.max(54, width - 54));
			motion.pos.y = clamp(motion.pos.y, 54, Math.max(54, height - 54));
			motion.target.x = clamp(motion.target.x, 64, Math.max(64, width - 64));
			motion.target.y = clamp(motion.target.y, 64, Math.max(64, height - 64));
		};

		const scaleFor = () => clamp(Math.min(width, height) / 560, 0.85, 1.15);

		const paint = () => {
			drawButterfly(context, sprite, motion, width, height, scaleFor());
		};

		const loop = (time: number) => {
			if (!running) return;
			const delta = last ? Math.min(0.05, (time - last) / 1000) : 0.016;
			last = time;
			updateMotion(motion, delta, width, height);
			paint();
			frame = requestAnimationFrame(loop);
		};

		const start = () => {
			if (running || reduced || !visible || document.hidden) return;
			running = true;
			last = 0;
			frame = requestAnimationFrame(loop);
		};

		const stop = () => {
			running = false;
			if (frame) cancelAnimationFrame(frame);
			frame = 0;
		};

		const renderStatic = () => {
			stop();
			motion.pos = { x: width * 0.56, y: height * 0.4 };
			motion.heading = -0.5;
			motion.flapPhase = 0.7;
			paint();
		};

		resize();
		motion = createMotion(width, height);
		paint();

		const observer = new ResizeObserver(() => {
			resize();
			if (reduced) renderStatic();
			else paint();
		});
		observer.observe(stage);

		const intersection = new IntersectionObserver(
			(entries) => {
				visible = entries.some((entry) => entry.isIntersecting);
				if (visible) start();
				else stop();
			},
			{ threshold: 0.02 }
		);
		intersection.observe(stage);

		const onVisibility = () => {
			if (document.hidden) stop();
			else start();
		};
		document.addEventListener('visibilitychange', onVisibility);

		const onMotionPreference = () => {
			reduced = media.matches;
			if (reduced) renderStatic();
			else start();
		};
		media.addEventListener?.('change', onMotionPreference);

		if (reduced) renderStatic();
		else start();

		return () => {
			stop();
			observer.disconnect();
			intersection.disconnect();
			document.removeEventListener('visibilitychange', onVisibility);
			media.removeEventListener?.('change', onMotionPreference);
		};
	});
</script>

<div bind:this={host} class="butterfly-host" aria-hidden="true">
	<canvas bind:this={canvas} class="butterfly-canvas"></canvas>
</div>

<style>
	.butterfly-host {
		position: absolute;
		z-index: 0;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}

	.butterfly-canvas {
		display: block;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
</style>
