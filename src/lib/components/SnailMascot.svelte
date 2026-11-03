<script lang="ts">
	import { onMount } from 'svelte';

	type Rgb = readonly [number, number, number];

	// The mascot is drawn in art pixels, then scaled onto a crisp canvas. Width
	// and height keep the same ratio at every breakpoint.
	const ART_W = 56;
	const ART_H = 46;
	const ORIGIN_X = 28;
	const ORIGIN_Y = 40;

	const INK: Rgb = [30, 24, 18];
	const SLIME: Rgb = [213, 255, 53];

	const SHELL_RAMP: readonly Rgb[] = [
		[86, 50, 21],
		[118, 74, 31],
		[154, 102, 44],
		[188, 132, 60],
		[214, 166, 92],
		[240, 206, 144]
	];

	const BODY_RAMP: readonly Rgb[] = [
		[52, 56, 40],
		[74, 78, 55],
		[100, 104, 75],
		[128, 132, 96],
		[156, 160, 120],
		[186, 188, 154]
	];

	const BODY: Rgb = [132, 136, 100];
	const BODY_LIGHT: Rgb = [186, 188, 154];
	const BODY_MID: Rgb = [112, 116, 84];
	const BODY_DARK: Rgb = [62, 66, 47];
	const EYE_LIGHT: Rgb = [246, 240, 214];
	const EYE_DARK: Rgb = [24, 20, 15];

	const FOOT_W = 56;
	const FOOT_H = 12;
	const FOOT_ORIGIN_X = 28;
	const FOOT_ORIGIN_Y = 10;
	const FOOT_FRAMES = 6;

	const BODY_W = 40;
	const BODY_H = 30;
	const BODY_ORIGIN_X = 12;
	const BODY_ORIGIN_Y = 26;

	const SHELL_W = 40;
	const SHELL_H = 38;
	const SHELL_X = -4;
	const SHELL_Y = -19;

	function clamp(value: number, min: number, max: number) {
		return Math.min(Math.max(value, min), max);
	}

	function fract(value: number) {
		return value - Math.floor(value);
	}

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

	function tone(ramp: readonly Rgb[], value: number): Rgb {
		const index = clamp(Math.round(value * (ramp.length - 1)), 0, ramp.length - 1);
		return ramp[index] ?? INK;
	}

	function ellipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number, rotation = 0) {
		const cos = Math.cos(rotation);
		const sin = Math.sin(rotation);
		const dx = x - cx;
		const dy = y - cy;
		const u = dx * cos + dy * sin;
		const v = -dx * sin + dy * cos;
		return (u * u) / (rx * rx) + (v * v) / (ry * ry);
	}

	function capsule(x: number, y: number, x0: number, y0: number, x1: number, y1: number, halfWidth: number) {
		const dx = x1 - x0;
		const dy = y1 - y0;
		const lengthSq = dx * dx + dy * dy;
		const t = lengthSq === 0 ? 0 : clamp(((x - x0) * dx + (y - y0) * dy) / lengthSq, 0, 1);
		return Math.hypot(x - (x0 + dx * t), y - (y0 + dy * t)) / halfWidth;
	}

	function writePixel(image: ImageData, offset: number, colour: Rgb, alpha = 255) {
		image.data[offset] = colour[0];
		image.data[offset + 1] = colour[1];
		image.data[offset + 2] = colour[2];
		image.data[offset + 3] = alpha;
	}

	/**
	 * The shell: a circular whorl with growth rings, a lit crest, a shaded
	 * aperture and a soft occlusion where it meets the foot.
	 */
	function buildShell(): HTMLCanvasElement | null {
		const canvas = document.createElement('canvas');
		canvas.width = SHELL_W;
		canvas.height = SHELL_H;
		const context = canvas.getContext('2d');
		if (!context) return null;

		const image = context.createImageData(SHELL_W, SHELL_H);
		const cx = SHELL_W / 2;
		const cy = SHELL_H / 2;
		const rx = SHELL_W / 2 - 1.5;
		const ry = SHELL_H / 2 - 1.5;

		for (let py = 0; py < SHELL_H; py += 1) {
			for (let px = 0; px < SHELL_W; px += 1) {
				const x = px + 0.5 - cx;
				const y = py + 0.5 - cy;
				const nu = x / rx;
				const nv = y / ry;
				const distance = Math.hypot(nu, nv);
				if (distance > 1.02) continue;

				const offset = (py * SHELL_W + px) * 4;
				const grain = hash(px + 0.52, py + 1.31);

				if (distance > 0.94) {
					writePixel(image, offset, SHELL_RAMP[0] ?? INK);
					continue;
				}

				const theta = Math.atan2(nv, nu);
				const spiral = (Math.log(Math.max(distance, 0.05)) - 0.15) * 1.8 - theta / (2 * Math.PI);
				const whorl = fract(spiral);
				const ring = fract(distance * 11 - theta * 0.5 + grain * 0.2);

				let shade = 0.6 + 0.4 * (0.5 - nv * 0.55 - nu * 0.28);
				shade += whorl < 0.16 ? -0.28 : whorl > 0.84 ? 0.15 : 0;
				shade += ring < 0.12 ? -0.13 : ring > 0.88 ? 0.09 : 0;
				shade += (grain - 0.5) * 0.1;

				const specular = ellipse(x, y, -6, -7.5, 6.5, 5, -0.4);
				if (specular < 1) shade += 0.22 * (1 - specular);

				// Occlusion along the bottom lip, where the shell rests on the body.
				if (nv > 0.42) shade -= 0.22 * (nv - 0.42);
				if (distance > 0.66 && nv > 0.15 && nu > -0.35) shade -= 0.12;

				let colour = tone(SHELL_RAMP, clamp(shade, 0, 1));
				if (Math.abs(whorl - 0.5) < 0.035) {
					colour = mix(colour, SHELL_RAMP[SHELL_RAMP.length - 1] ?? colour, 0.32);
				}
				if (grain > 0.982) colour = mix(colour, SHELL_RAMP[0] ?? colour, 0.45);

				writePixel(image, offset, colour);
			}
		}

		context.putImageData(image, 0, 0);
		return canvas;
	}

	/** One frame of the muscular foot: a slow wave travels along the sole. */
	function buildFoot(phase: number): HTMLCanvasElement | null {
		const canvas = document.createElement('canvas');
		canvas.width = FOOT_W;
		canvas.height = FOOT_H;
		const context = canvas.getContext('2d');
		if (!context) return null;

		const image = context.createImageData(FOOT_W, FOOT_H);
		const wave = phase * Math.PI * 2;

		for (let py = 0; py < FOOT_H; py += 1) {
			for (let px = 0; px < FOOT_W; px += 1) {
				const x = px + 0.5 - FOOT_ORIGIN_X;
				const y = py + 0.5 - FOOT_ORIGIN_Y;

				// A rounded, slightly tapered foot with a lifted, rippling sole.
				const lift = Math.sin(x * 0.42 + wave) * 0.7;
				const top = -7.2 + Math.sin(x * 0.3 + wave * 0.5) * 0.6;
				const bottom = lift;
				const shape = ellipse(x, y, -1, (top + bottom) / 2, 23, (bottom - top) / 2 + 0.6);
				if (shape > 1) continue;

				// Tail and head ends round off; the sole is translucent skin.
				const offset = (py * FOOT_W + px) * 4;
				const rim = shape > 0.72;
				const grain = hash(px + 2.4, py + 0.7);
				const band = Math.sin(x * 0.5 + wave);

				if (rim) {
					const skin = mix(BODY_MID, SLIME, 0.2 + Math.max(0, band) * 0.16);
					writePixel(image, offset, band < -0.6 ? mix(skin, BODY_DARK, 0.35) : skin, 200);
					continue;
				}

				let shade = 0.42 + (1 - shape) * 0.16;
				shade += band > 0.62 ? 0.15 : band < -0.62 ? -0.13 : 0;
				shade += (grain - 0.5) * 0.08;
				// A pale highlight along the flank keeps the foot feeling soft.
				if (y < -4.6) shade += 0.08;

				writePixel(image, offset, tone(BODY_RAMP, clamp(shade, 0, 1)));
			}
		}

		context.putImageData(image, 0, 0);
		return canvas;
	}

	/** Neck and head, drawn once; the eye stalks are procedural on top. */
	function buildBody(): HTMLCanvasElement | null {
		const canvas = document.createElement('canvas');
		canvas.width = BODY_W;
		canvas.height = BODY_H;
		const context = canvas.getContext('2d');
		if (!context) return null;

		const image = context.createImageData(BODY_W, BODY_H);

		for (let py = 0; py < BODY_H; py += 1) {
			for (let px = 0; px < BODY_W; px += 1) {
				const x = px + 0.5 - BODY_ORIGIN_X;
				const y = py + 0.5 - BODY_ORIGIN_Y;

				const neck = capsule(x, y, 3, -9, 13, -14, 4.4);
				const head = ellipse(x, y, 17, -16, 6.2, 5.4);
				const score = Math.min(neck, head);
				if (score > 1) continue;

				const offset = (py * BODY_W + px) * 4;
				const grain = hash(px + 5.1, py + 3.3);
				const rim = score > 0.78;

				if (rim) {
					writePixel(image, offset, mix(BODY_MID, SLIME, 0.16), 215);
					continue;
				}

				let shade = 0.5 + (1 - score) * 0.22 - y * 0.006;
				if (head <= 1) {
					// Crown highlight and the dark little mouth line.
					if (ellipse(x, y, 17.4, -18.6, 3.4, 2) < 1) shade += 0.16;
					if (x > 20.4 && Math.abs(y + 14.6) < 0.8) shade -= 0.4;
				}
				shade += (grain - 0.5) * 0.07;

				writePixel(image, offset, tone(BODY_RAMP, clamp(shade, 0, 1)));
			}
		}

		context.putImageData(image, 0, 0);
		return canvas;
	}

	type Sprite = {
		shell: HTMLCanvasElement;
		body: HTMLCanvasElement;
		foot: HTMLCanvasElement[];
	};

	function buildSprite(): { shell: HTMLCanvasElement; body: HTMLCanvasElement; foot: HTMLCanvasElement[] } | null {
		const shell = buildShell();
		const body = buildBody();
		if (!shell || !body) return null;

		const foot: HTMLCanvasElement[] = [];
		for (let index = 0; index < FOOT_FRAMES; index += 1) {
			const frame = buildFoot(index / FOOT_FRAMES);
			if (!frame) return null;
			foot.push(frame);
		}

		return { shell, body, foot };
	}

	function css(colour: Rgb) {
		return `rgb(${colour[0]}, ${colour[1]}, ${colour[2]})`;
	}

	function drawStalk(
		context: CanvasRenderingContext2D,
		baseX: number,
		baseY: number,
		angle: number,
		length: number,
		closed: boolean,
		eyeShift: number
	) {
		const steps = Math.max(3, Math.round(length));
		let x = baseX;
		let y = baseY;

		for (let step = 0; step <= steps; step += 1) {
			const t = step / steps;
			const heading = angle + Math.sin(t * Math.PI) * 0.18;
			const width = t < 0.55 ? 2 : 1;
			context.fillStyle = css(mix(BODY, BODY_LIGHT, 0.3 + t * 0.45));
			context.fillRect(Math.round(x), Math.round(y), width, width);
			x += Math.cos(heading);
			y += Math.sin(heading);
		}

		const eyeX = Math.round(x) - 1 + Math.round(eyeShift);
		const eyeY = Math.round(y) - 1;

		context.fillStyle = css(BODY_DARK);
		context.fillRect(eyeX - 1, eyeY - 1, 4, 4);

		if (closed) {
			// A blink is one quiet horizontal line.
			context.fillStyle = css(EYE_DARK);
			context.fillRect(eyeX, eyeY, 2, 1);
			return;
		}

		context.fillStyle = css(EYE_LIGHT);
		context.fillRect(eyeX, eyeY - 1, 2, 2);
		context.fillStyle = css(EYE_DARK);
		context.fillRect(eyeX + 1, eyeY, 1, 1);
	}

	function drawLowerTentacle(context: CanvasRenderingContext2D, baseX: number, baseY: number, angle: number, length: number) {
		let x = baseX;
		let y = baseY;
		const steps = Math.max(3, Math.round(length));
		for (let step = 0; step <= steps; step += 1) {
			const t = step / steps;
			const heading = angle + Math.sin(t * Math.PI) * 0.25;
			context.fillStyle = css(mix(BODY, BODY_LIGHT, 0.42));
			context.fillRect(Math.round(x), Math.round(y), 1, 1);
			x += Math.cos(heading);
			y += Math.sin(heading);
		}
	}

	type Behaviour = 'idle' | 'crawling' | 'auto';

	type Mascot = {
		state: 'idle' | 'crawl';
		timer: number;
		gait: number;
		wave: number;
		sway: number;
		rest: number;
		breathe: number;
		blink: number;
		blinkPhase: number;
		stalk: { phase: number; rate: number; drift: number; eye: number }[];
		seed: number;
		time: number;
	};

	function createMascot(): Mascot {
		return {
			state: 'idle',
			timer: 3 + Math.random() * 3,
			gait: Math.random(),
			wave: Math.random(),
			sway: 0,
			rest: 1,
			breathe: Math.random() * Math.PI * 2,
			blink: 2 + Math.random() * 4,
			blinkPhase: 0,
			stalk: [
				{ phase: Math.random() * Math.PI * 2, rate: 0.8 + Math.random() * 0.4, drift: Math.random() * Math.PI * 2, eye: 0 },
				{ phase: Math.random() * Math.PI * 2, rate: 0.62 + Math.random() * 0.5, drift: Math.random() * Math.PI * 2, eye: 0 }
			],
			seed: Math.random() * 100,
			time: Math.random() * 20
		};
	}

	function pickState(mascot: Mascot, behaviour: Behaviour) {
		if (behaviour === 'idle') {
			mascot.state = 'idle';
			mascot.timer = 6 + Math.random() * 8;
			return;
		}
		if (behaviour === 'crawling') {
			mascot.state = 'crawl';
			mascot.timer = 5 + Math.random() * 6;
			return;
		}

		// Auto: mostly calm, with occasional slow crawls.
		mascot.state = Math.random() < 0.58 ? 'idle' : 'crawl';
		mascot.timer =
			mascot.state === 'idle' ? 4 + Math.random() * 7 : 3 + Math.random() * 4;
	}

	function updateMascot(mascot: Mascot, dt: number, behaviour: Behaviour, speed: number) {
		const step = dt * clamp(speed, 0.2, 3);
		mascot.time += step;
		mascot.timer -= step;

		if (mascot.timer <= 0) pickState(mascot, behaviour);

		const target = mascot.state === 'crawl' ? 0 : 1;
		mascot.rest += (target - mascot.rest) * Math.min(1, 1.6 * step);

		const crawl = 1 - mascot.rest;
		mascot.gait = fract(mascot.gait + step * (mascot.state === 'crawl' ? 0.55 : 0.12));
		mascot.wave = fract(mascot.wave + step * (mascot.state === 'crawl' ? 0.65 : 0.1));
		mascot.breathe += step * 1.4;

		const swayTarget = Math.sin(mascot.gait * Math.PI * 2) * 1.5 * crawl;
		mascot.sway += (swayTarget - mascot.sway) * Math.min(1, 3 * step);

		mascot.blink -= step;
		if (mascot.blink <= 0) {
			mascot.blink = 2.4 + Math.random() * 5.5;
			mascot.blinkPhase = 1;
		}
		mascot.blinkPhase = Math.max(0, mascot.blinkPhase - step * 5);

		for (const stalk of mascot.stalk) {
			stalk.eye += step * 0.6;
		}
	}

	function drawMascot(context: CanvasRenderingContext2D, sprite: Sprite, mascot: Mascot, width: number, height: number, scale: number) {
		context.clearRect(0, 0, width, height);
		context.save();
		context.scale(scale, scale);
		context.translate(ORIGIN_X, ORIGIN_Y);

		// Contact shadow, painted as a dithered pixel ellipse.
		context.fillStyle = 'rgba(0, 0, 0, 0.16)';
		for (let px = -18; px <= 18; px += 1) {
			const heightAt = Math.sqrt(Math.max(0, 1 - (px / 19) ** 2)) * 2.4;
			for (let py = 0; py < heightAt; py += 1) {
				if (hash(px + 1.7, py + 3.1) > 0.25) context.fillRect(px, py + 0.6, 1, 1);
			}
		}

		const crawl = 1 - mascot.rest;
		const breathe = Math.sin(mascot.breathe) * 0.35;
		const bodyY = breathe * 0.6 + mascot.rest * 0.35 - crawl * 0.15;
		const bodyX = mascot.sway;
		const footFrame = sprite.foot[clamp(Math.floor(mascot.wave * FOOT_FRAMES), 0, FOOT_FRAMES - 1)];
		if (footFrame) context.drawImage(footFrame, -FOOT_ORIGIN_X, -FOOT_ORIGIN_Y);

		context.save();
		context.translate(bodyX, bodyY);
		context.drawImage(sprite.body, -BODY_ORIGIN_X, -BODY_ORIGIN_Y);

		const blinkClosed = mascot.blinkPhase > 0.45;
		const retract = 1 - mascot.rest * 0.14 + crawl * 0.05;
		const look = Math.sin(mascot.time * 0.23 + mascot.seed) * 0.2;

		for (let index = 0; index < mascot.stalk.length; index += 1) {
			const stalk = mascot.stalk[index];
			if (!stalk) continue;
			const side = index === 0 ? -1 : 1;
			const baseX = index === 0 ? 15.4 : 19.2;
			const baseY = -19.4;
			const sway = Math.sin(mascot.time * stalk.rate + stalk.phase) * 0.13;
			const drift = Math.sin(mascot.time * 0.31 + stalk.drift) * 0.12;
			const angle = -Math.PI / 2 + side * 0.42 + sway + drift + look * side;
			const length = (11.4 + (index === 0 ? 0.6 : 0)) * retract;
			const eyeShift = Math.sin(stalk.eye + stalk.phase) * 0.4;

			drawStalk(context, baseX, baseY, angle, length, blinkClosed, eyeShift);
		}

		// Two small lower tentacles beside the mouth, feeling the ground ahead.
		const lowerSway = Math.sin(mascot.time * 1.1 + mascot.seed) * 0.16;
		drawLowerTentacle(context, 21.6, -11.8, -0.1 + lowerSway, 5.4);
		drawLowerTentacle(context, 20.8, -11.2, 0.24 + lowerSway * 0.7, 4.6);

		context.restore();

		// The shell rides the body with a breath of secondary motion.
		const shellBob = Math.sin(mascot.gait * Math.PI * 4) * 0.4 * crawl + mascot.rest * 0.25 + breathe * 0.2;
		const shellTilt = Math.sin(mascot.time * 0.28 + mascot.seed) * 0.018;

		context.save();
		context.translate(SHELL_X + bodyX * 0.45, SHELL_Y + shellBob);
		context.rotate(shellTilt);
		context.drawImage(sprite.shell, -SHELL_W / 2, -SHELL_H / 2);
		context.restore();

		context.restore();
	}

	let {
		variant = 'navbar',
		animated = true,
		size = 0,
		speed = 1,
		behavior = 'auto'
	}: {
		variant?: 'navbar' | 'footer';
		animated?: boolean;
		size?: number;
		speed?: number;
		behavior?: 'idle' | 'crawling' | 'auto';
	} = $props();

	const targetWidth = $derived(size > 0 ? size : variant === 'footer' ? 64 : 40);
	const canvasWidth = $derived(Math.max(18, Math.round(targetWidth)));
	const canvasHeight = $derived(Math.round((canvasWidth * ART_H) / ART_W));

	let host = $state<HTMLElement | undefined>(undefined);
	let canvas = $state<HTMLCanvasElement | undefined>(undefined);

	onMount(() => {
		const stage = host;
		const surface = canvas;
		if (!stage || !surface) return;

		const context = surface.getContext('2d');
		const sprite = buildSprite();
		if (!context || !sprite) return;

		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		let reduced = media.matches;
		let mascot = createMascot();
		let frame = 0;
		let running = false;
		let visible = false;
		let last = 0;

		const scaleFor = () => canvasWidth / ART_W;

		const resize = () => {
			const ratio = Math.min(window.devicePixelRatio || 1, 2);
			surface.width = Math.round(canvasWidth * ratio);
			surface.height = Math.round(canvasHeight * ratio);
			surface.style.width = `${canvasWidth}px`;
			surface.style.height = `${canvasHeight}px`;
			context.setTransform(ratio, 0, 0, ratio, 0, 0);
			context.imageSmoothingEnabled = false;
		};

		const paint = () => {
			drawMascot(context, sprite, mascot, canvasWidth, canvasHeight, scaleFor());
		};

		const loop = (time: number) => {
			if (!running) return;
			const delta = last ? Math.min(0.05, (time - last) / 1000) : 0.016;
			last = time;
			updateMascot(mascot, delta, behavior, speed);
			paint();
			frame = requestAnimationFrame(loop);
		};

		const start = () => {
			if (running || reduced || !animated || !visible || document.hidden) return;
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
			mascot = createMascot();
			mascot.state = 'idle';
			mascot.rest = 1;
			mascot.gait = 0.25;
			mascot.wave = 0.2;
			mascot.sway = 0;
			mascot.blinkPhase = 0;
			paint();
		};

		resize();
		if (reduced) renderStatic();
		else paint();

		const observer = new ResizeObserver(() => {
			resize();
			if (!running) paint();
		});
		observer.observe(stage);

		const intersection = new IntersectionObserver(
			(entries) => {
				visible = entries.some((entry) => entry.isIntersecting);
				if (visible) start();
				else stop();
			},
			{ threshold: 0.05 }
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

		start();

		return () => {
			stop();
			observer.disconnect();
			intersection.disconnect();
			document.removeEventListener('visibilitychange', onVisibility);
			media.removeEventListener?.('change', onMotionPreference);
		};
	});
</script>

<span bind:this={host} class="snail-mascot" data-variant={variant} aria-hidden="true">
	<canvas
		bind:this={canvas}
		class="snail-mascot-canvas"
		style={`width:${canvasWidth}px; height:${canvasHeight}px`}
	></canvas>
</span>

<style>
	.snail-mascot {
		display: inline-grid;
		flex: 0 0 auto;
		place-items: center;
		line-height: 0;
		pointer-events: none;
		user-select: none;
	}

	.snail-mascot-canvas {
		display: block;
		image-rendering: pixelated;
	}
</style>
