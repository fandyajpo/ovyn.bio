<script lang="ts">
	import { onMount } from 'svelte';

	type Rgb = readonly [number, number, number];

	const INK: Rgb = [38, 34, 26];
	const SLIME: Rgb = [213, 255, 53];
	const BODY_LIGHT: Rgb = [186, 190, 150];
	const BODY: Rgb = [142, 146, 108];
	const BODY_MID: Rgb = [112, 116, 84];
	const BODY_DARK: Rgb = [66, 70, 50];
	const EYE_LIGHT: Rgb = [246, 240, 214];
	const EYE_DARK: Rgb = [24, 20, 15];
	const SHADOW_INK: Rgb = [8, 9, 7];

	// Six-step ramps keep the shading posterised, the way hand-placed pixel art
	// reads best, while the sampling below still gives it depth.
	const BODY_RAMP: readonly Rgb[] = [
		[54, 57, 42],
		[76, 80, 57],
		[102, 106, 77],
		[130, 134, 98],
		[158, 162, 122],
		[188, 190, 156]
	];

	const SHELL_RAMP: readonly Rgb[] = [
		[88, 52, 22],
		[120, 76, 32],
		[156, 104, 45],
		[190, 134, 62],
		[216, 168, 94],
		[242, 208, 146]
	];

	const BODY_W = 68;
	const BODY_H = 52;
	const BODY_ORIGIN_X = 40;
	const BODY_ORIGIN_Y = 26;

	const SHELL_W = 46;
	const SHELL_H = 42;
	const SHELL_LOCAL_X = -8.5;
	const SHELL_LOCAL_Y = -1.5;

	const SHADOW_W = 56;
	const SHADOW_H = 22;

	const STRETCH_STEPS = 7;
	const WAVE_STEPS = 8;

	function clamp(value: number, min: number, max: number) {
		return Math.min(Math.max(value, min), max);
	}

	function fract(value: number) {
		return value - Math.floor(value);
	}

	/** Deterministic value noise, so the pixel texture is stable between builds. */
	function hash(x: number, y: number) {
		const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
		return value - Math.floor(value);
	}

	function mix(a: Rgb, b: Rgb, t: number): Rgb {
		const amount = clamp(t, 0, 1);
		return [
			Math.round(a[0] + (b[0] - a[0]) * amount),
			Math.round(a[1] + (b[1] - a[1]) * amount),
			Math.round(a[2] + (b[2] - a[2]) * amount)
		];
	}

	function css(colour: Rgb, alpha = 1) {
		const base = `rgb(${colour[0]} ${colour[1]} ${colour[2]})`;
		return alpha >= 1 ? base : `rgb(${colour[0]} ${colour[1]} ${colour[2]} / ${alpha})`;
	}

	function pick(ramp: readonly Rgb[], index: number): Rgb {
		const position = clamp(Math.round(index), 0, ramp.length - 1);
		return ramp[position] ?? INK;
	}

	function angleDelta(a: number, b: number) {
		return Math.atan2(Math.sin(a - b), Math.cos(a - b));
	}

	/** Squared normalised distance, so 1 is the ellipse outline. */
	function ellipseScore(
		x: number,
		y: number,
		cx: number,
		cy: number,
		rx: number,
		ry: number,
		rotation = 0
	) {
		const cos = Math.cos(rotation);
		const sin = Math.sin(rotation);
		const dx = x - cx;
		const dy = y - cy;
		const u = dx * cos + dy * sin;
		const v = -dx * sin + dy * cos;
		return (u * u) / (rx * rx) + (v * v) / (ry * ry);
	}

	/** Distance to a thick segment, measured in half-widths. */
	function capsuleScore(x: number, y: number, x0: number, y0: number, x1: number, y1: number, halfWidth: number) {
		const dx = x1 - x0;
		const dy = y1 - y0;
		const lengthSq = dx * dx + dy * dy;
		const t = lengthSq === 0 ? 0 : clamp(((x - x0) * dx + (y - y0) * dy) / lengthSq, 0, 1);
		const cx = x0 + dx * t;
		const cy = y0 + dy * t;
		return Math.hypot(x - cx, y - cy) / halfWidth;
	}

	function writePixel(image: ImageData, offset: number, colour: Rgb, alpha = 255) {
		image.data[offset] = colour[0];
		image.data[offset + 1] = colour[1];
		image.data[offset + 2] = colour[2];
		image.data[offset + 3] = alpha;
	}

	/**
	 * The shell is generated once: a log-spiral whorl with growth rings and
	 * ridges, lit from the upper left, shaded into the aperture, and dotted with
	 * a little organic grain.
	 */
	function buildShell(): HTMLCanvasElement | null {
		const canvas = document.createElement('canvas');
		canvas.width = SHELL_W;
		canvas.height = SHELL_H;
		const context = canvas.getContext('2d');
		if (!context) return null;

		const image = context.createImageData(SHELL_W, SHELL_H);
		const centreX = SHELL_W / 2;
		const centreY = SHELL_H / 2 + 1;
		const radiusX = SHELL_W / 2 - 2;
		const radiusY = SHELL_H / 2 - 2.5;

		for (let py = 0; py < SHELL_H; py += 1) {
			for (let px = 0; px < SHELL_W; px += 1) {
				const x = px + 0.5 - centreX;
				const y = py + 0.5 - centreY;
				const nu = x / radiusX;
				const nv = y / radiusY;
				const distance = Math.hypot(nu, nv);
				if (distance > 1.02) continue;

				const offset = (py * SHELL_W + px) * 4;
				const grain = hash(px + 0.37, py + 1.71);

				if (distance > 0.955) {
					writePixel(image, offset, SHELL_RAMP[0] ?? INK);
					continue;
				}

				const theta = Math.atan2(nv, nu);
				const spiral = (Math.log(Math.max(distance, 0.05)) - 0.2) * 1.9 - theta / (2 * Math.PI);
				const whorl = fract(spiral);
				const ring = fract(distance * 12.5 - theta * 0.6 + grain * 0.25);

				// Dome lighting, the grooves of the whorl and the growth rings.
				let tone = 0.62 + 0.42 * (0.5 - nv * 0.55 - nu * 0.3);
				tone += whorl < 0.14 ? -0.3 : whorl > 0.85 ? 0.16 : 0;
				tone += ring < 0.1 ? -0.14 : ring > 0.9 ? 0.1 : 0;
				tone += (grain - 0.5) * 0.12;

				const specular = ellipseScore(x, y, -7.5, -8, 7.5, 5.5, -0.45);
				if (specular < 1) tone += 0.24 * (1 - specular);

				// Ambient occlusion where the shell sits on the foot.
				if (nv > 0.45) tone -= 0.2 * (nv - 0.45);
				if (distance > 0.7 && nv > 0.2 && nu > -0.4) tone -= 0.12;

				let colour = pick(SHELL_RAMP, clamp(tone, 0, 1) * (SHELL_RAMP.length - 1));

				if (Math.abs(whorl - 0.5) < 0.03) {
					colour = mix(colour, SHELL_RAMP[SHELL_RAMP.length - 1] ?? colour, 0.35);
				}
				if (grain > 0.985) colour = mix(colour, SHELL_RAMP[0] ?? colour, 0.5);

				writePixel(image, offset, colour);
			}
		}

		context.putImageData(image, 0, 0);
		return canvas;
	}

	function buildShadow(): HTMLCanvasElement | null {
		const canvas = document.createElement('canvas');
		canvas.width = SHADOW_W;
		canvas.height = SHADOW_H;
		const context = canvas.getContext('2d');
		if (!context) return null;

		const image = context.createImageData(SHADOW_W, SHADOW_H);
		const radiusX = SHADOW_W / 2 - 2;
		const radiusY = SHADOW_H / 2 - 2;

		for (let py = 0; py < SHADOW_H; py += 1) {
			for (let px = 0; px < SHADOW_W; px += 1) {
				const x = px + 0.5 - SHADOW_W / 2;
				const y = py + 0.5 - SHADOW_H / 2;
				const distance = Math.hypot(x / radiusX, y / radiusY);
				if (distance > 1) continue;

				const grain = hash(px + 5.3, py + 2.9);
				const alpha = Math.round(56 * (1 - distance) + (grain > 0.82 ? 8 : 0));
				if (alpha <= 4) continue;

				writePixel(image, (py * SHADOW_W + px) * 4, SHADOW_INK, alpha);
			}
		}

		context.putImageData(image, 0, 0);
		return canvas;
	}

	type BodyShape = {
		footCx: number;
		footRx: number;
		footRy: number;
		headX: number;
		headRx: number;
		headRy: number;
		neckHalf: number;
	};

	function bodyScore(x: number, y: number, shape: BodyShape) {
		const foot = ellipseScore(x, y, shape.footCx, 0, shape.footRx, shape.footRy);
		const neck = capsuleScore(x, y, -9, 0, shape.headX - 1.5, 0, shape.neckHalf);
		const head = ellipseScore(x, y, shape.headX, 0, shape.headRx, shape.headRy);
		return Math.min(foot, neck, head);
	}

	/**
	 * One locomotion frame of the body: `stretch` runs from a compressed to an
	 * extended foot, `wave` is where the muscular contraction wave sits.
	 */
	function buildBodyFrame(stretchIndex: number, waveIndex: number): HTMLCanvasElement | null {
		const canvas = document.createElement('canvas');
		canvas.width = BODY_W;
		canvas.height = BODY_H;
		const context = canvas.getContext('2d');
		if (!context) return null;

		const stretch = (stretchIndex / Math.max(1, STRETCH_STEPS - 1)) * 2 - 1;
		const wave = waveIndex / WAVE_STEPS;
		const shape: BodyShape = {
			footCx: -1.5 + stretch * 1.4,
			footRx: 23.6 + stretch * 1.6,
			footRy: 8.6 - Math.abs(stretch) * 0.3,
			headX: 17.4 + stretch * 3.2,
			headRx: 7.2,
			headRy: 6.4,
			neckHalf: 4.6 + stretch * 0.15
		};

		const scores = new Float32Array(BODY_W * BODY_H);
		for (let py = 0; py < BODY_H; py += 1) {
			for (let px = 0; px < BODY_W; px += 1) {
				scores[py * BODY_W + px] = bodyScore(px + 0.5 - BODY_ORIGIN_X, py + 0.5 - BODY_ORIGIN_Y, shape);
			}
		}

		const sample = (px: number, py: number) => {
			if (px < 0 || py < 0 || px >= BODY_W || py >= BODY_H) return 9;
			return scores[py * BODY_W + px] ?? 9;
		};

		const image = context.createImageData(BODY_W, BODY_H);

		for (let py = 0; py < BODY_H; py += 1) {
			for (let px = 0; px < BODY_W; px += 1) {
				const score = sample(px, py);
				if (score > 1.04) continue;

				const x = px + 0.5 - BODY_ORIGIN_X;
				const y = py + 0.5 - BODY_ORIGIN_Y;
				const offset = (py * BODY_W + px) * 4;

				const edge =
					score > 0.97 ||
					sample(px - 1, py) > 1 ||
					sample(px + 1, py) > 1 ||
					sample(px, py - 1) > 1 ||
					sample(px, py + 1) > 1;

				if (edge) {
					writePixel(image, offset, BODY_DARK);
					continue;
				}

				const foot = ellipseScore(x, y, shape.footCx, 0, shape.footRx, shape.footRy);
				const neck = capsuleScore(x, y, -9, 0, shape.headX - 1.5, 0, shape.neckHalf);
				const head = ellipseScore(x, y, shape.headX, 0, shape.headRx, shape.headRy);
				const grain = hash(px + 3.1, py + 0.6);

				if (head <= 1) {
					let tone = 0.66 - y * 0.03 + (shape.headX - x) * 0.01;
					tone += (grain - 0.5) * 0.09;

					// A highlight on the crown, then the mouth and its speckles.
					if (ellipseScore(x, y, shape.headX + 0.6, -1.8, 3.6, 2.4) < 1) tone += 0.18;
					if (x > shape.headX + 3.4 && Math.abs(y) < 1.1) tone -= 0.46;
					else if (grain > 0.9 && Math.abs(y) < 4) tone += 0.08;

					writePixel(image, offset, pick(BODY_RAMP, clamp(tone, 0, 1) * (BODY_RAMP.length - 1)));
					continue;
				}

				if (neck <= 1) {
					const rib = Math.sin(x * 0.85 - wave * Math.PI * 2);
					let tone = 0.52 + (rib > 0.7 ? 0.12 : rib < -0.7 ? -0.1 : 0) - y * 0.01;
					tone += (grain - 0.5) * 0.08;
					writePixel(image, offset, pick(BODY_RAMP, clamp(tone, 0, 1) * (BODY_RAMP.length - 1)));
					continue;
				}

				// The muscular foot: a travelling contraction band, a translucent
				// skin at the rim and a pale sole along the centre line.
				const rim = foot > 0.78;
				const band = Math.sin(x * 0.52 + wave * Math.PI * 2);

				if (rim) {
					const skinBase = mix(BODY_MID, SLIME, 0.2 + Math.max(0, band) * 0.16);
					const skin = band < -0.6 ? mix(skinBase, BODY_DARK, 0.35) : skinBase;
					writePixel(image, offset, skin, 196);
					continue;
				}

				let tone = 0.44 + (1 - foot) * 0.12;
				tone += band > 0.62 ? 0.16 : band < -0.62 ? -0.14 : 0;
				if (foot < 0.4 && Math.abs(y) < 2.6) tone += 0.1;
				tone += (grain - 0.5) * 0.1;

				writePixel(image, offset, pick(BODY_RAMP, clamp(tone, 0, 1) * (BODY_RAMP.length - 1)));
			}
		}

		context.putImageData(image, 0, 0);
		return canvas;
	}

	type Frames = {
		shell: HTMLCanvasElement;
		shadow: HTMLCanvasElement;
		body: HTMLCanvasElement[];
	};

	function buildFrames(): Frames | null {
		const shell = buildShell();
		const shadow = buildShadow();
		if (!shell || !shadow) return null;

		const body: HTMLCanvasElement[] = [];
		for (let s = 0; s < STRETCH_STEPS; s += 1) {
			for (let w = 0; w < WAVE_STEPS; w += 1) {
				const frame = buildBodyFrame(s, w);
				if (!frame) return null;
				body.push(frame);
			}
		}

		return { shell, shadow, body };
	}

	type Behaviour = 'crawling' | 'exploring' | 'resting' | 'alert' | 'turning';

	type Tentacle = { phase: number; rate: number; bend: number };

	type Snail = {
		x: number;
		y: number;
		heading: number;
		headingTarget: number;
		speed: number;
		speedTarget: number;
		behaviour: Behaviour;
		timer: number;
		gait: number;
		wave: number;
		stretch: number;
		rest: number;
		alertness: number;
		turn: number;
		seed: number;
		time: number;
		tentacles: Tentacle[];
	};

	function createSnail(width: number, height: number): Snail {
		const heading = Math.random() * Math.PI * 2;
		return {
			x: width * 0.32,
			y: height * 0.74,
			heading,
			headingTarget: heading,
			speed: 0,
			speedTarget: 10,
			behaviour: 'crawling',
			timer: 5,
			gait: Math.random(),
			wave: Math.random(),
			stretch: 0,
			rest: 0,
			alertness: 0,
			turn: 0,
			seed: Math.random() * 100,
			time: Math.random() * 20,
			tentacles: [
				{ phase: Math.random() * Math.PI * 2, rate: 0.9 + Math.random() * 0.3, bend: 0.3 + Math.random() * 0.2 },
				{ phase: Math.random() * Math.PI * 2, rate: 0.75 + Math.random() * 0.35, bend: 0.3 + Math.random() * 0.2 },
				{ phase: Math.random() * Math.PI * 2, rate: 1.4 + Math.random() * 0.4, bend: 0.5 },
				{ phase: Math.random() * Math.PI * 2, rate: 1.2 + Math.random() * 0.5, bend: 0.5 }
			]
		};
	}

	function pickBehaviour(snail: Snail) {
		const roll = Math.random();

		if (roll < 0.4) {
			snail.behaviour = 'crawling';
			snail.timer = 7 + Math.random() * 9;
			snail.speedTarget = 10 + Math.random() * 7;
		} else if (roll < 0.64) {
			snail.behaviour = 'exploring';
			snail.timer = 5 + Math.random() * 6;
			snail.speedTarget = 5 + Math.random() * 4;
			snail.headingTarget += (Math.random() - 0.5) * 1.4;
		} else if (roll < 0.8) {
			snail.behaviour = 'resting';
			snail.timer = 6 + Math.random() * 10;
			snail.speedTarget = 0;
		} else if (roll < 0.9) {
			snail.behaviour = 'alert';
			snail.timer = 3 + Math.random() * 4;
			snail.speedTarget = 0;
		} else {
			snail.behaviour = 'turning';
			snail.timer = 3.5 + Math.random() * 4;
			snail.speedTarget = 4 + Math.random() * 3;
			snail.headingTarget += (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random() * 1.2);
		}
	}

	function updateSnail(snail: Snail, dt: number, width: number, height: number, margin: number) {
		snail.time += dt;
		snail.timer -= dt;

		if (snail.timer <= 0) pickBehaviour(snail);

		// Resting and alert are body states as much as movement states.
		snail.rest += ((snail.behaviour === 'resting' ? 1 : 0) - snail.rest) * Math.min(1, 2.2 * dt);
		snail.alertness += ((snail.behaviour === 'alert' ? 1 : 0) - snail.alertness) * Math.min(1, 2.6 * dt);

		// Boundary awareness: bend the heading towards the middle well before any
		// part of the body could touch an edge.
		const steerX =
			snail.x < margin
				? (margin - snail.x) / Math.max(1, margin)
				: snail.x > width - margin
					? -(snail.x - (width - margin)) / Math.max(1, margin)
					: 0;
		const steerY =
			snail.y < margin
				? (margin - snail.y) / Math.max(1, margin)
				: snail.y > height - margin
					? -(snail.y - (height - margin)) / Math.max(1, margin)
					: 0;

		let desired = snail.headingTarget;
		if (steerX !== 0 || steerY !== 0) {
			const inward = Math.atan2(steerY, steerX);
			const strength = clamp(Math.hypot(steerX, steerY) * 1.6, 0, 1);
			desired += angleDelta(inward, desired) * strength;
			if (strength > 0.35) snail.headingTarget = inward + Math.sin(snail.time * 0.3 + snail.seed) * 0.4;
		}

		// Two slow noise bands keep the path from ever being a straight line.
		const wander =
			Math.sin(snail.time * 0.41 + snail.seed) * 0.34 + Math.sin(snail.time * 0.19 + snail.seed * 2.7) * 0.2;
		desired += wander * (snail.speed > 0.5 ? 1 - snail.alertness * 0.6 : 0.35);

		const turnRate = snail.behaviour === 'turning' ? 0.55 : 0.34;
		const delta = angleDelta(desired, snail.heading);
		const step = clamp(delta * Math.min(1, 1.9 * dt), -turnRate * dt, turnRate * dt);
		snail.heading += step;
		snail.turn += (step / Math.max(dt, 0.0001) - snail.turn) * Math.min(1, 5 * dt);

		const acceleration = snail.speedTarget > snail.speed ? 3.4 : 4.2;
		snail.speed += clamp(snail.speedTarget - snail.speed, -acceleration * dt, acceleration * dt);

		snail.x += Math.cos(snail.heading) * snail.speed * dt;
		snail.y += Math.sin(snail.heading) * snail.speed * dt;

		// Last-resort containment; the steering above should get there first.
		snail.x = clamp(snail.x, margin, Math.max(margin, width - margin));
		snail.y = clamp(snail.y, margin, Math.max(margin, height - margin));

		const motion = clamp(snail.speed / 14, 0, 1.4);
		snail.gait = fract(snail.gait + dt * (0.32 + motion * 0.95));
		snail.wave = fract(snail.wave + dt * (0.12 + motion * 0.6));

		const stretchTarget = Math.sin(snail.gait * Math.PI * 2) * 0.5 * clamp(motion, 0, 1) - snail.rest * 0.3;
		snail.stretch += (stretchTarget - snail.stretch) * Math.min(1, 4.5 * dt);
	}

	/** Stalks are drawn pixel by pixel so they can sway and curl every frame. */
	function drawStalk(
		context: CanvasRenderingContext2D,
		baseX: number,
		baseY: number,
		angle: number,
		length: number,
		thickness: number,
		bend: number,
		withEye: boolean
	) {
		const steps = Math.max(2, Math.round(length));
		let x = baseX;
		let y = baseY;

		for (let step = 0; step <= steps; step += 1) {
			const t = step / steps;
			const heading = angle + bend * t * t;
			const width = thickness === 2 && t < 0.6 ? 2 : 1;
			context.fillStyle = css(mix(BODY, BODY_LIGHT, 0.25 + t * 0.5));
			context.fillRect(Math.round(x), Math.round(y), width, width);
			x += Math.cos(heading);
			y += Math.sin(heading);
		}

		if (!withEye) return;

		// The eye rides the tip of the stalk, with a socket, a pale eyeball and a
		// single catchlight pixel.
		const eyeX = Math.round(x) - 1;
		const eyeY = Math.round(y) - 1;
		context.fillStyle = css(BODY_DARK);
		context.fillRect(eyeX - 1, eyeY - 1, 4, 4);
		context.fillStyle = css(EYE_LIGHT);
		context.fillRect(eyeX, eyeY - 1, 2, 2);
		context.fillStyle = css(EYE_DARK);
		context.fillRect(eyeX + 1, eyeY, 1, 1);
	}

	function drawTentacles(context: CanvasRenderingContext2D, snail: Snail) {
		const baseX = 21.5 + snail.stretch * 2.8;

		for (let index = 0; index < snail.tentacles.length; index += 1) {
			const tentacle = snail.tentacles[index];
			if (!tentacle) continue;

			const side = index % 2 === 0 ? -1 : 1;
			const upper = index < 2;
			const sway = Math.sin(snail.time * tentacle.rate + tentacle.phase);
			const baseY = side * (upper ? 3.9 : 2.6);
			const angle = side * (upper ? 0.5 + sway * 0.16 + snail.alertness * 0.18 : 0.95 + sway * 0.2);
			const length =
				(upper ? 14.5 : 6.4) * (1 + snail.alertness * 0.18 - snail.rest * 0.3) + sway * (upper ? 1.4 : 0.5);
			const lean = snail.turn * (upper ? 0.3 : 0.18);

			drawStalk(
				context,
				baseX + (upper ? 0 : 2.4),
				baseY,
				angle + lean,
				Math.max(3, length),
				upper ? 2 : 1,
				upper ? tentacle.bend : 0.4,
				upper
			);
		}
	}

	function drawSnail(
		context: CanvasRenderingContext2D,
		frames: Frames,
		snail: Snail,
		width: number,
		height: number,
		scale: number
	) {
		context.clearRect(0, 0, width, height);

		// Snap to the art grid so the body never shimmers between pixels.
		const grid = Math.max(1, scale);
		const x = Math.round(snail.x / grid) * grid;
		const y = Math.round(snail.y / grid) * grid;

		context.save();
		context.translate(x, y);
		context.rotate(snail.heading);
		context.scale(scale, scale);

		context.drawImage(frames.shadow, -SHADOW_W / 2 + 2, -SHADOW_H / 2 + 2.5);

		const stretchIndex = clamp(
			Math.round(((snail.stretch + 1) / 2) * (STRETCH_STEPS - 1)),
			0,
			STRETCH_STEPS - 1
		);
		const waveIndex = clamp(Math.floor(snail.wave * WAVE_STEPS), 0, WAVE_STEPS - 1);
		const body = frames.body[stretchIndex * WAVE_STEPS + waveIndex];
		if (body) context.drawImage(body, -BODY_ORIGIN_X, -BODY_ORIGIN_Y);

		drawTentacles(context, snail);

		// The shell rides the back with a breath of its own: a slight bob with the
		// gait, a settle while resting, and a tiny lean through turns.
		const shellBob = Math.sin(snail.gait * Math.PI * 4) * 0.5 + snail.rest * 0.6;
		const shellTilt = Math.sin(snail.time * 0.37 + snail.seed) * 0.025 + snail.turn * 0.06;

		context.save();
		context.translate(SHELL_LOCAL_X, SHELL_LOCAL_Y + shellBob);
		context.rotate(shellTilt);
		context.drawImage(frames.shell, -SHELL_W / 2, -SHELL_H / 2);
		context.restore();

		context.restore();
	}

	let host = $state<HTMLDivElement | undefined>(undefined);
	let canvas = $state<HTMLCanvasElement | undefined>(undefined);

	onMount(() => {
		const stage = host;
		const surface = canvas;
		if (!stage || !surface) return;

		const context = surface.getContext('2d');
		const frames = buildFrames();
		if (!context || !frames) return;

		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		let reduced = media.matches;
		let width = 0;
		let height = 0;
		let scale = 1.4;
		let margin = 70;
		let frame = 0;
		let paintAccumulator = 0;
		let running = false;
		let visible = false;
		let last = 0;
		let snail = createSnail(320, 260);

		const resize = () => {
			const rect = stage.getBoundingClientRect();
			width = Math.max(1, Math.round(rect.width));
			height = Math.max(1, Math.round(rect.height));
			const ratio = Math.min(window.devicePixelRatio || 1, 2);
			surface.width = Math.round(width * ratio);
			surface.height = Math.round(height * ratio);
			surface.style.width = `${width}px`;
			surface.style.height = `${height}px`;
			context.setTransform(ratio, 0, 0, ratio, 0, 0);
			context.imageSmoothingEnabled = false;

			// Whole-number pixel scales keep the art crisp: one art pixel becomes a
			// whole number of device pixels instead of a smeared fraction.
			scale = width >= 1100 ? 2 : width >= 640 ? 1.5 : 1;
			margin = Math.round(34 + 26 * scale);
			snail.x = clamp(snail.x, margin, Math.max(margin, width - margin));
			snail.y = clamp(snail.y, margin, Math.max(margin, height - margin));
		};

		const paint = () => {
			drawSnail(context, frames, snail, width, height, scale);
		};

		const loop = (time: number) => {
			if (!running) return;
			const delta = last ? Math.min(0.05, (time - last) / 1000) : 0.016;
			last = time;
			updateSnail(snail, delta, width, height, margin);

			// A snail has no business repainting at 60fps; 30 is plenty and leaves
			// the rest of the page its frames.
			paintAccumulator += delta;
			if (paintAccumulator >= 1 / 30) {
				paintAccumulator = 0;
				paint();
			}

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
			snail.x = width * 0.6;
			snail.y = height * 0.7;
			snail.heading = -0.45;
			snail.headingTarget = snail.heading;
			snail.speed = 0;
			snail.speedTarget = 0;
			snail.rest = 1;
			snail.alertness = 0;
			snail.stretch = -0.2;
			snail.gait = 0.3;
			snail.wave = 0.4;
			paint();
		};

		resize();
		snail = createSnail(width, height);
		if (reduced) renderStatic();
		else paint();

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

		if (!reduced) start();

		return () => {
			stop();
			observer.disconnect();
			intersection.disconnect();
			document.removeEventListener('visibilitychange', onVisibility);
			media.removeEventListener?.('change', onMotionPreference);
		};
	});
</script>

<div bind:this={host} class="snail-host" aria-hidden="true">
	<canvas bind:this={canvas} class="snail-canvas"></canvas>
</div>

<style>
	.snail-host {
		position: absolute;
		z-index: 0;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}

	.snail-canvas {
		display: block;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
</style>
