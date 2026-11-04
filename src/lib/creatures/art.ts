import type { CreatureSpecies } from '#lib/schemas/creatures';

export type Rgb = readonly [number, number, number];

type Palette = readonly Rgb[];

type SpritePaint = (x: number, y: number) => [Rgb, number?] | null;

const INK: Rgb = [20, 17, 14];
const EYE_LIGHT: Rgb = [250, 244, 226];
const EYE_DARK: Rgb = [18, 16, 14];

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
	const amount = clamp(t, 0, 1);
	return [
		Math.round(a[0] + (b[0] - a[0]) * amount),
		Math.round(a[1] + (b[1] - a[1]) * amount),
		Math.round(a[2] + (b[2] - a[2]) * amount)
	];
}

function tone(ramp: Palette, value: number): Rgb {
	const index = Math.round(clamp(value, 0, 1) * (ramp.length - 1));
	return ramp[index] ?? INK;
}

function grain(x: number, y: number) {
	const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
	return value - Math.floor(value);
}

/** Squared normalised distance, so 1 is the ellipse outline. */
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

/**
 * Sprites are painted at twice their logical grid and box-downsampled, so the
 * fine details (veins, feather rows, scale arcs) survive at any display size
 * and edges get a gentle anti-alias instead of a hard stair.
 */
const SUPER_SAMPLE = 2;
/** Render resolution multiplier: every logical sprite pixel becomes 2×2 canvas pixels. */
const SPRITE_SCALE = 2;

function renderSprite(
	width: number,
	height: number,
	originX: number,
	originY: number,
	paint: SpritePaint,
	outline: Rgb | null = INK
): HTMLCanvasElement | null {
	const canvas = document.createElement('canvas');
	canvas.width = width * SPRITE_SCALE;
	canvas.height = height * SPRITE_SCALE;
	const context = canvas.getContext('2d');
	if (!context) return null;

	const ss = SUPER_SAMPLE;
	const sw = canvas.width * ss;
	const sh = canvas.height * ss;
	const unit = ss * SPRITE_SCALE;

	// 1. Paint at the supersampled grid; coordinates stay in sprite units.
	const sample = new Float32Array(sw * sh * 4);
	const covered = new Uint8Array(sw * sh);
	for (let sy = 0; sy < sh; sy += 1) {
		for (let sx = 0; sx < sw; sx += 1) {
			const hit = paint((sx + 0.5) / unit - originX, (sy + 0.5) / unit - originY);
			if (!hit) continue;
			const offset = (sy * sw + sx) * 4;
			sample[offset] = hit[0][0];
			sample[offset + 1] = hit[0][1];
			sample[offset + 2] = hit[0][2];
			sample[offset + 3] = hit[1] ?? 255;
			covered[sy * sw + sx] = 1;
		}
	}

	// 2. Box-downsample into the final canvas, weighted by alpha.
	const image = context.createImageData(canvas.width, canvas.height);
	const filled = new Uint8Array(canvas.width * canvas.height);
	for (let py = 0; py < canvas.height; py += 1) {
		for (let px = 0; px < canvas.width; px += 1) {
			let red = 0;
			let green = 0;
			let blue = 0;
			let alphaSum = 0;
			let weight = 0;
			for (let dy = 0; dy < ss; dy += 1) {
				for (let dx = 0; dx < ss; dx += 1) {
					const sampleIndex = (py * ss + dy) * sw + (px * ss + dx);
					if (!covered[sampleIndex]) continue;
					const offset = sampleIndex * 4;
					const alpha = sample[offset + 3] ?? 0;
					red += (sample[offset] ?? 0) * alpha;
					green += (sample[offset + 1] ?? 0) * alpha;
					blue += (sample[offset + 2] ?? 0) * alpha;
					alphaSum += alpha;
					weight += 1;
				}
			}
			if (weight === 0 || alphaSum === 0) continue;
			const index = py * canvas.width + px;
			const offset = index * 4;
			image.data[offset] = Math.round(red / alphaSum);
			image.data[offset + 1] = Math.round(green / alphaSum);
			image.data[offset + 2] = Math.round(blue / alphaSum);
			image.data[offset + 3] = Math.round(alphaSum / weight);
			filled[index] = 1;
		}
	}

	if (outline) {
		for (let py = 0; py < canvas.height; py += 1) {
			for (let px = 0; px < canvas.width; px += 1) {
				const index = py * canvas.width + px;
				if (!filled[index]) continue;
				const edge =
					px === 0 ||
					py === 0 ||
					px === canvas.width - 1 ||
					py === canvas.height - 1 ||
					!filled[index - 1] ||
					!filled[index + 1] ||
					!filled[index - canvas.width] ||
					!filled[index + canvas.width];
				if (!edge) continue;
				const offset = index * 4;
				// Anti-aliased silhouette pixels stay soft; only solid pixels ink over.
				if ((image.data[offset + 3] ?? 0) < 150) continue;
				image.data[offset] = outline[0];
				image.data[offset + 1] = outline[1];
				image.data[offset + 2] = outline[2];
				image.data[offset + 3] = 255;
			}
		}

		// A second pass adds volume: a warm rim on the lit side, a cool contact
		// edge on the shadow side, and a soft inner occlusion band.
		const filledAt = (px: number, py: number) =>
			px >= 0 && py >= 0 && px < canvas.width && py < canvas.height && filled[py * canvas.width + px] === 1;

		for (let py = 0; py < canvas.height; py += 1) {
			for (let px = 0; px < canvas.width; px += 1) {
				const index = py * canvas.width + px;
				if (!filled[index]) continue;

				const offset = index * 4;
				const alpha = image.data[offset + 3] ?? 0;
				if (alpha < 200) continue;

				const litSide = !filledAt(px - 1, py) || !filledAt(px, py - 1);
				const darkSide = !filledAt(px + 1, py) || !filledAt(px, py + 1);
				const innerEdge = !filledAt(px - 2, py) || !filledAt(px, py - 2);

				let amount = 0;
				let target: Rgb | null = null;
				if (litSide) {
					amount = 0.16;
					target = [252, 236, 198] as const;
				} else if (darkSide) {
					amount = 0.12;
					target = [16, 14, 12] as const;
				} else if (innerEdge) {
					amount = 0.05;
					target = [22, 18, 14] as const;
				}				if (!target || amount === 0) continue;

				const current: Rgb = [
					image.data[offset] ?? 0,
					image.data[offset + 1] ?? 0,
					image.data[offset + 2] ?? 0
				];
				const shaded = mix(current, target, amount);
				image.data[offset] = shaded[0];
				image.data[offset + 1] = shaded[1];
				image.data[offset + 2] = shaded[2];
			}
		}
	}

	context.putImageData(image, 0, 0);
	return canvas;
}

export type CreatureArt = {
	body: HTMLCanvasElement;
	bodyW: number;
	bodyH: number;
	/** A right-hand wing whose canvas spans x [-w/2, w/2] and y [0, h]. */
	wing: HTMLCanvasElement | null;
	wingW: number;
	wingH: number;
	hingeX: number;
	hingeY: number;
	tail: HTMLCanvasElement | null;
	tailX: number;
	tailY: number;
	crest: HTMLCanvasElement | null;
	crestX: number;
	crestY: number;
	/** Base opacity, used by the ghost. */
	alpha: number;
	glow: boolean;
};

// Dragonfly — sunset wings and a striped body, from the reference.
const DF_DARK: Rgb = [36, 16, 14];
const DF_RED: Rgb = [212, 64, 44];
const DF_ORANGE: Rgb = [244, 140, 56];
const DF_AMBER: Rgb = [250, 196, 108];
const DF_PINK: Rgb = [240, 130, 130];
const DF_TEAL: Rgb = [110, 180, 170];
const DF_SMOKE: Rgb = [64, 46, 46];
// Bat — charcoal membrane wings and fluffy grey fur, from the reference.
const BAT_DARK: Rgb = [30, 30, 34];
const BAT_MEMBRANE: Rgb = [40, 40, 46];
const BAT_LIGHT: Rgb = [76, 76, 84];
const BAT_FUR: Rgb = [66, 66, 74];
const BAT_FANG: Rgb = [232, 228, 216];
// Eagle — bald plumage: dark brown flight feathers, white head and fanned tail.
const EAGLE_DARK: Rgb = [52, 32, 18];
const EAGLE_BROWN: Rgb = [96, 58, 30];
const EAGLE_LIGHT: Rgb = [150, 102, 56];
const EAGLE_CREAM: Rgb = [236, 230, 216];
const EAGLE_BEAK: Rgb = [232, 178, 52];
// Crow — black with an iridescent blue sheen, from the reference.
const CROW_DARK: Rgb = [16, 17, 22];
const CROW_MID: Rgb = [30, 32, 42];
const CROW_LIGHT: Rgb = [52, 56, 70];
const CROW_SHEEN: Rgb = [70, 92, 118];
// Parrot — scarlet with a yellow crown and blue flight feathers.
const PAR_RED: Rgb = [196, 44, 52];
const PAR_RED_DARK: Rgb = [140, 24, 34];
const PAR_YELLOW: Rgb = [248, 204, 80];
const PAR_BLUE: Rgb = [64, 98, 168];
const PAR_BEAK: Rgb = [160, 150, 138];
const PAR_FACE: Rgb = [232, 224, 208];
const COCKATOO: Palette = [
	[112, 106, 104],
	[150, 142, 138],
	[186, 178, 170],
	[214, 206, 196],
	[236, 230, 220],
	[252, 250, 244]
];
const FISH: Palette = [
	[38, 62, 88],
	[60, 90, 118],
	[90, 126, 152],
	[124, 160, 176],
	[168, 196, 202],
	[214, 230, 226]
];
const DRAGON: Palette = [
	[16, 42, 28],
	[24, 64, 40],
	[36, 90, 52],
	[56, 120, 66],
	[88, 150, 88],
	[132, 182, 116]
];
const PTEROSAUR: Palette = [
	[38, 28, 22],
	[58, 42, 30],
	[86, 64, 42],
	[118, 90, 56],
	[154, 122, 80],
	[194, 164, 116]
];
const QUETZ: Palette = [
	[48, 42, 36],
	[74, 64, 54],
	[104, 92, 76],
	[138, 122, 100],
	[174, 158, 132],
	[210, 196, 172]
];
const GHOST: Palette = [
	[92, 88, 122],
	[122, 116, 152],
	[152, 146, 180],
	[182, 178, 206],
	[212, 208, 230],
	[240, 238, 250]
];
const HORN: Rgb = [222, 208, 174];
const BEAK: Rgb = [226, 168, 58];

// ---------------------------------------------------------------------------
// The Great Mormon, rebuilt from the owner's reference: cream forewings with
// black veins and scalloped spotted margins, red hindwing spots, swallowtail
// tails, and a slender dark body. The craft bar every species aims at.
// ---------------------------------------------------------------------------

const MORMON_INK: Rgb = [30, 22, 16];
const MORMON_CREAM: Rgb = [250, 244, 226];
const MORMON_CREAM_DIM: Rgb = [224, 214, 190];
const MORMON_RED: Rgb = [186, 42, 36];
const MORMON_BODY_TONE: Rgb = [58, 40, 28];
const MORMON_BODY_DARK: Rgb = [34, 23, 16];
const MORMON_BODY_LIGHT: Rgb = [96, 70, 48];

function insideMormonWing(u: number, v: number) {
	// Fore lobe (swept forward) and hind lobe, plus the twin swallowtail
	// tails trailing rearward.
	if (ellipse(u, v, 13, 12, 13, 12, -0.28) <= 1) return true;
	if (ellipse(u, v, -5, 16, 10, 8.4, 0.12) <= 1) return true;
	if (segHit(u, v, -6, 15, -20, 18) || segHit(u, v, -8, 19, -21, 23)) return true;
	return false;
}

function paintButterflyWing(u: number, v: number): [Rgb, number?] | null {
	if (!insideMormonWing(u, v)) return null;

	const fore = ellipse(u, v, 13, 12, 13, 12, -0.28);
	const hind = ellipse(u, v, -5, 16, 10, 8.4, 0.12);
	const onFore = fore <= 1;

	// Swallowtail tails: black ribbons with a cream spine.
	if (segHit(u, v, -6, 15, -20, 18) || segHit(u, v, -8, 19, -21, 23)) {
		if (segHit(u, v, -8, 17.2, -19, 19.8) || segHit(u, v, -10, 21.4, -20, 23)) {
			return [MORMON_CREAM_DIM, 1];
		}
		return [MORMON_INK, 1];
	}

	// Margin: the scalloped black border.
	const margin = 0.09 + Math.abs(Math.sin(u * 0.85 + v * 0.7 + (onFore ? 0 : 2.1))) * 0.03;
	if (onFore ? fore > 1 - margin : hind > 1 - margin - 0.02) {
		// Pale spots pierce the fore wing's border.
		if (onFore && v > 4 && grain(u * 1.6, v * 1.2) > 0.6) return [MORMON_CREAM, 1];
		return [MORMON_INK, 1];
	}

	// Veins: black, fanning from the fore and hind roots.
	const root = onFore ? [6, 1] : [-5, 5];
	const dist = Math.hypot(u - root[0], v - root[1]);
	const angle = Math.atan2(v - root[1], u - root[0]);
	const rays = onFore ? [-0.55, -0.22, 0.06, 0.34, 0.6, 0.88] : [-0.5, -0.15, 0.2, 0.55];
	const reach = onFore ? 17 : 12;
	if (dist > 2.4 && dist < reach + 5 && rays.some((r) => Math.abs(Math.atan2(Math.sin(angle - r), Math.cos(angle - r))) < 0.05)) {
		return [MORMON_INK, 1];
	}

	// Red spots just inside the hind margin.
	for (const [ru, rv] of [[-13, 15], [-9, 17], [-15, 11], [-10, 13]] as const) {
		if (Math.hypot(u - ru, v - rv) < 1.2) return [MORMON_RED, 1];
	}

	// Base: warm cream with living grain.
	const shade = grain(u * 1.3, v * 1.1) > 0.88 ? 0.16 : grain(u, v) > 0.94 ? -0.12 : 0;
	return [mix(MORMON_CREAM, MORMON_CREAM_DIM, 0.38 + shade), 1];
}

function segHit(x: number, y: number, x0: number, y0: number, x1: number, y1: number): boolean {
	const dx = x1 - x0;
	const dy = y1 - y0;
	const lengthSq = dx * dx + dy * dy;
	const t = lengthSq === 0 ? 0 : clamp(((x - x0) * dx + (y - y0) * dy) / lengthSq, 0, 1);
	return Math.hypot(x - (x0 + dx * t), y - (y0 + dy * t)) <= 0.6;
}

function paintButterflyBody(x: number, y: number): [Rgb, number?] | null {
	// Slender dark body in flight orientation: antennae forward (+x),
	// segmented abdomen trailing (-x), wings attaching along y = 0.
	const ly = -x;
	const lx = y;

	// Abdomen with clear segment rings.
	if (ly >= 6 && ly <= 20) {
		const half = Math.max(1, Math.round(3.4 - ((ly - 6) / 14) * 2.2));
		if (Math.abs(lx) <= half) {
			const rim = Math.abs(lx) === half || ly === 20;
			const ring = ly % 3 === 0;
			return [rim ? MORMON_BODY_DARK : ring ? MORMON_BODY_LIGHT : MORMON_BODY_TONE, 1];
		}
		return null;
	}

	// Thorax with fuzz.
	if (ly >= -6 && ly <= 6) {
		const half = ly < -3 || ly > 3 ? 3 : 4;
		if (Math.abs(lx) <= half) {
			return [grain(ly, lx) > 0.7 ? MORMON_BODY_LIGHT : MORMON_BODY_TONE, 1];
		}
		return null;
	}

	// Head with eyes.
	if (ly >= -13 && ly <= -5) {
		if (ly >= -9 && ly <= -5 && Math.abs(lx) <= 2) {
			return [MORMON_BODY_DARK, 1];
		}
		return [MORMON_BODY_TONE, 1];
	}

	// Antennae with clubs, sweeping forward.
	for (const side of [-1, 1] as const) {
		if (segHit(x, y, 9, side, 15, side * 4) || segHit(x, y, 15, side * 4, 20, side * 7)) {
			return [MORMON_BODY_DARK, 1];
		}
		if (Math.hypot(x - 20, y - side * 7) <= 1) return [MORMON_BODY_DARK, 1];
	}

	return null;
}

function paintDragonflyBody(x: number, y: number): [Rgb, number?] | null {
	// Striped abdomen: red rings over a near-black rod, tapering rearward.
	if (x >= -26 && x <= 2 && Math.abs(y) <= 2.2 - Math.max(0, (2 - x) * 0.06)) {
		const ring = Math.floor((x + 26) / 2.6) % 2 === 0;
		return [ring ? DF_RED : mix(DF_DARK, [110, 30, 26], 0.4), 1];
	}
	// Thin cerci at the tail tip.
	if (x >= -30 && x < -26 && (Math.abs(y - 0.8) < 0.5 || Math.abs(y + 0.8) < 0.5)) {
		return [DF_DARK, 1];
	}
	// Thorax.
	if (x >= 2 && x <= 8 && Math.abs(y) <= 4) {
		return [mix(DF_DARK, [90, 40, 34], grain(x, y) * 0.4), 1];
	}
	// Head with wrap-around eyes.
	if (x >= 8 && x <= 13 && Math.abs(y) <= 4.4) {
		if (Math.abs(y) > 2.2 && x > 10) return [[24, 44, 40], 1];
		return [mix(DF_DARK, [70, 34, 30], 0.5), 1];
	}
	return null;
}

function paintDragonflyWing(u: number, v: number): [Rgb, number?] | null {
	// Four wing panels per side share the canvas: fore (forward of the hinge)
	// and hind (behind it), painted as one swept surface.
	const fore = ellipse(u, v, 6, 13, 6.6, 10, 0.06);
	const hind = ellipse(u, v, -6, 17, 7.4, 11.4, -0.06);
	if (fore > 1 && hind > 1) return null;
	const onFore = fore <= 1;

	// Dark smoky root the wings share near the body.
	if (v < 6) return [DF_SMOKE, 225];

	// Longitudinal veins and cross rungs, dark over the warm film.
	const veins =
		Math.abs(((u * 2.6 + v * (onFore ? 0.4 : -0.6)) % 5) - 2.5) < 0.6 ||
		Math.abs(((v + u * 0.3) % 4) - 2) < 0.35;
	if (veins && v > 7) return [mix(DF_DARK, DF_RED, 0.3), 215];

	// The sunset gradient: amber → orange → pink, with teal at the tips.
	const gradient = v / 30;
	let film =
		gradient < 0.45
			? mix(DF_AMBER, DF_ORANGE, 1 - gradient * 2.2)
			: mix(DF_PINK, DF_ORANGE, Math.max(0, (0.8 - gradient) * 2.5));
	if (gradient > 0.78) film = mix(film, DF_TEAL, 0.4);

	// The pterostigma: a dark cell near the fore wing's leading tip.
	if (onFore && u > 9 && v < 10) return [DF_DARK, 230];

	return [film, 215];
}

function paintBatBody(x: number, y: number): [Rgb, number?] | null {
	// Ears reaching forward of the head, with dark inner membranes.
	if (ellipse(x, y, 11, 3, 2.6, 1.4) <= 1 || ellipse(x, y, 11, -3, 2.6, 1.4) <= 1) {
		const inner = ellipse(x, y, 11.4, 3, 1.2, 0.7) <= 1 || ellipse(x, y, 11.4, -3, 1.2, 0.7) <= 1;
		return [inner ? BAT_DARK : BAT_FUR, 1];
	}
	// Head and fluffy body.
	if (ellipse(x, y, 8, 0, 3.6, 2.4) <= 1 || ellipse(x, y, -2, 0, 6.4, 2.8) <= 1) {
		const fuzz = grain(x * 1.4, y * 1.4) > 0.6 ? mix(BAT_FUR, BAT_LIGHT, 0.25) : BAT_FUR;
		return [fuzz, 1];
	}
	// Eyes and tiny fangs.
	if (ellipse(x, y, 8, 1.4, 0.6, 0.6) <= 1 || ellipse(x, y, 8, -1.4, 0.6, 0.6) <= 1) {
		return [[14, 14, 16], 1];
	}
	if ((x === 11 || x === 10) && Math.abs(y) < 0.4) {
		return [BAT_FANG, 1];
	}
	// Feet.
	if (capsule(x, y, -6, 2, -11, 3.4, 0.8) <= 1 || capsule(x, y, -6, -2, -11, -3.4, 0.8) <= 1) {
		return [BAT_DARK, 1];
	}
	return null;
}

function paintBatWing(u: number, v: number): [Rgb, number?] | null {
	// The scalloped trailing edge: membrane dips between finger tips.
	const depth = 25 - Math.abs(Math.sin((u + 18) * 0.55 + 0.5)) * 5;
	if (v > depth || v < 0) return null;
	// Finger struts from the shoulder to the scallop peaks.
	const struts: Array<[number, number]> = [
		[16, 8],
		[7, 23],
		[-8, 25],
		[-16, 17]
	];
	for (const [tu, tv] of struts) {
		if (capsule(u, v, 6, 0, tu, tv, 0.9) <= 1) return [BAT_DARK, 1];
	}
	// Membrane: lighter panels between the struts.
	const panel = grain(u * 0.8, v) > 0.5 ? 0.1 : 0;
	const shade = clamp(0.45 + (v / 30) * 0.2 + panel + (grain(u, v) - 0.5) * 0.08, 0, 1);
	let colour = mix(BAT_MEMBRANE, BAT_LIGHT, shade * 0.7);
	// Thin pale trailing edge.
	if (v > depth - 1.2) colour = mix(colour, [130, 130, 138], 0.5);
	return [colour, 240];
}

function paintEagleBody(x: number, y: number): [Rgb, number?] | null {
	// White fanned tail with separated feathers.
	if (x >= -29 && x <= -13 && Math.abs(y) <= 6.4 - Math.abs(x + 21) * 0.28) {
		const feather = Math.round(y) % 2 === 0;
		return [feather ? EAGLE_CREAM : mix(EAGLE_CREAM, EAGLE_BROWN, 0.2), 1];
	}
	// Dark brown body and shoulders.
	if (x >= -14 && x <= 14 && Math.abs(y) <= 5.6 - Math.max(0, x - 6) * 0.35) {
		return [mix(EAGLE_DARK, EAGLE_BROWN, 0.45 + grain(x, y) * 0.3), 1];
	}
	// White head with the pale nape.
	if (x >= 13 && x <= 24 && Math.abs(y) <= 3.8) {
		return [mix(EAGLE_CREAM, [200, 194, 180], grain(x, y) * 0.3), 1];
	}
	// Eye.
	if (Math.hypot(x - 18.4, y + 0.6) <= 1) return [[24, 20, 16], 1];
	// Hooked yellow beak.
	if (x >= 23 && x <= 28 && Math.abs(y) <= 1.6 - (x - 23) * 0.3) {
		return [EAGLE_BEAK, 1];
	}
	return null;
}

function paintEagleWing(u: number, v: number): [Rgb, number?] | null {
	// The leading edge sweeps from the shoulder; the trailing edge fans out
	// toward the body's rear with scalloped primaries.
	const leading = 2.4 + (u - 9) * 0.14;
	if (v < leading || v < 0) return null;
	const depth = 16 + clamp((-u - 2) * 1.15, 0, 15) + Math.abs(Math.sin(u * 1.05)) * 1.6;
	if (v > depth) return null;
	if (u < -14.5) return null;

	// Primary fingers at the trailing edge: dark tips with transparent notches.
	const primaries = clamp((-u - 2) * 1.15, 0, 15);
	if (primaries > 8 && v > depth - 2.6 && Math.sin(u * 1.35) > 0.25) return null;

	// Feather rows: lighter coverts over dark flight feathers.
	const row = Math.floor(v / 5.5);
	const shade = 0.34 + (v / 34) * 0.3 + (row % 2 === 0 ? 0.06 : -0.04) + (grain(u, v) - 0.5) * 0.08;
	let colour = mix(EAGLE_BROWN, EAGLE_LIGHT, clamp(shade, 0, 1) * 0.8);
	if (primaries > 8) colour = mix(colour, EAGLE_DARK, 0.45);
	// Warm rim along the leading edge.
	if (v < leading + 1.4) colour = mix(colour, EAGLE_CREAM, 0.28);
	return [colour, 1];
}

function paintCrowBody(x: number, y: number): [Rgb, number?] | null {
	// Fanned tail with rounded, separated feather tips.
	if (x >= -24 && x <= -11 && Math.abs(y) <= 4.6 - Math.abs(x + 18) * 0.22) {
		const gap = Math.round(y) % 2 === 0;
		return [gap ? CROW_MID : mix(CROW_DARK, [10, 10, 14], 0.4), 1];
	}
	// Body and neck, with an iridescent shoulder.
	if (x >= -12 && x <= 13 && Math.abs(y) <= 5.2 - Math.max(0, x - 6) * 0.4) {
		const sheen = grain(x * 0.8, y) > 0.75 ? mix(CROW_LIGHT, CROW_SHEEN, 0.5) : CROW_MID;
		return [mix(CROW_DARK, sheen, 0.5), 1];
	}
	// Head, sturdy beak, glinting eye.
	if (x >= 12 && x <= 20 && Math.abs(y) <= 3.4) {
		if (Math.hypot(x - 16, y - 0.8) <= 1) return [EYE_LIGHT, 1];
		return [mix(CROW_DARK, CROW_LIGHT, 0.3), 1];
	}
	if (x >= 19 && x <= 23 && Math.abs(y) <= 1.2) return [CROW_DARK, 1];
	return null;
}

function paintCrowWing(u: number, v: number): [Rgb, number?] | null {
	// The wing deepens toward the rear; primaries separate into fingers.
	if (v < 2 + Math.max(0, (u - 6) * 0.5) || v < 0) return null;
	const depth = 18 + clamp((-u + 2) * 1.1, 0, 13) + Math.abs(Math.sin(u * 1.2)) * 1.4;
	if (v > depth) return null;
	if (u < -14.5) return null;

	// Primary fingers: the outer feathers spread with transparent notches.
	const spread = clamp((-u - 4) * 1.2, 0, 14);
	if (spread > 8 && v > depth - 3 - spread * 0.2 && Math.sin(u * 1.5 + 1) > 0.15) return null;

	// Layered feather rows: coverts, secondaries, primaries.
	const row = Math.floor(v / 4.6);
	const shade = 0.4 + (v / 32) * 0.26 + (row % 2 ? -0.03 : 0.05) + (grain(u, v) - 0.5) * 0.07;
	let colour = mix(CROW_DARK, CROW_LIGHT, clamp(shade, 0, 1) * 0.85);
	// Iridescent sheen on the upper rows.
	if (row < 2 && grain(u * 0.9 + 3, v) > 0.78) colour = mix(colour, CROW_SHEEN, 0.45);
	// Feather shafts.
	if (Math.abs(((v - 2) % 4.6) - 2.3) < 0.3 && v > 6) colour = mix(colour, CROW_DARK, 0.4);
	return [colour, 1];
}

function paintParrotBody(x: number, y: number): [Rgb, number?] | null {
	// Yellow crown and cheek.
	if (x >= 8 && x <= 14 && Math.abs(y) <= 3.6) {
		if (Math.hypot(x - 11.4, y - 0.6) <= 1) return [[20, 18, 22], 1];
		return [mix(PAR_YELLOW, [230, 180, 120], grain(x, y) * 0.3), 1];
	}
	// Hooked grey beak.
	if (x >= 13 && x <= 17 && y >= -1 && y <= 3) return [PAR_BEAK, 1];
	// Scarlet body with a softer belly.
	if (x >= -10 && x <= 12 && Math.abs(y) <= 5.2 - Math.max(0, x - 4) * 0.3) {
		const belly = y > 1.6 ? 0.18 : 0;
		return [mix(PAR_RED, PAR_RED_DARK, 0.25 - belly + grain(x, y) * 0.1), 1];
	}
	return null;
}

function paintParrotWing(u: number, v: number): [Rgb, number?] | null {
	// Rounded wing: scalloped scarlet coverts over long blue flight feathers.
	const depth = 26 - Math.abs(u - 2) * 0.55;
	if (v > depth || v < 0 || Math.abs(u - 2) > 9.6) return null;
	const flight = v > depth - 12 - Math.abs(Math.sin(u * 1.1)) * 2;

	if (flight) {
		const feather = Math.abs(((v - 2) % 5.4) - 2.7) < 0.5;
		const tip = mix(PAR_BLUE, [30, 44, 86], (v - depth + 12) / 12);
		return [feather ? mix(tip, PAR_RED_DARK, 0.3) : tip, 1];
	}

	// Coverts: red scallops with darker edges.
	const row = Math.floor(v / 5);
	const scallop =
		Math.sin(u * 1.2 + row * 2.1) > 0.3
			? mix(PAR_RED, PAR_RED_DARK, 0.3)
			: mix(PAR_RED, [226, 96, 86], 0.35);
	// Yellow shoulder patch.
	if (u > 3 && v < 9) return [mix(PAR_YELLOW, PAR_RED, v / 12), 1];
	return [scallop, 1];
}

function paintParrotTail(u: number, v: number): [Rgb, number?] | null {
	// Graduated red feathers fading to blue tips.
	const half = 4.6 - Math.max(0, -u - 6) * 0.1;
	if (Math.abs(v) > half) return null;
	if (u < -16 || u > 2) return null;
	const tip = clamp((-u - 2) / 13, 0, 1);
	const feather = Math.abs(v % 2.2) < 0.4 && u < -6;
	return [mix(mix(PAR_RED, PAR_RED_DARK, tip * 0.6), PAR_BLUE, tip * 0.55 + (feather ? 0.15 : 0)), 1];
}

function paintCockatooBody(x: number, y: number): [Rgb, number?] | null {
	if (ellipse(x, y, -2, 0, 10, 5.8) <= 1) {
		const shade = 0.5 + (1 - ellipse(x, y, -2, 0, 10, 5.2)) * 0.28 + (grain(x, y) - 0.5) * 0.05;
		return [tone(COCKATOO, shade)];
	}
	if (ellipse(x, y, 8, 0, 4.2, 4) <= 1) {
		if (ellipse(x, y, 9.4, -1.2, 0.9, 0.9) <= 1) return [EYE_DARK];
		return [tone(COCKATOO, 0.7)];
	}
	if (capsule(x, y, 10.6, 0.6, 12.8, 1.6, 1.2) <= 1) return [[58, 52, 48]];
	return null;
}

function paintCockatooWing(x: number, y: number): [Rgb, number?] | null {
	if (y < 0 || y > 32) return null;
	const chord = 10 - y * 0.14;
	if (Math.abs(x) > chord) return null;

	const row = Math.floor(y / 4.5);
	const shade = 0.48 + (y / 32) * 0.26 + (row % 2 ? -0.03 : 0.05);
	return [tone(COCKATOO, shade)];
}

function paintCockatooCrest(x: number, y: number): [Rgb, number?] | null {
	if (y < 0 || y > 16) return null;
	const spread = 2 + y * 0.55;
	if (Math.abs(x) > spread) return null;
	if (Math.abs(x) < 0.9) return [[128, 116, 104]];
	// The crest splits into soft barbs.
	return Math.round((x + spread) / 1.8) % 2 === 0 ? [[230, 190, 62]] : [[246, 210, 82]];
}

function paintFishBody(x: number, y: number): [Rgb, number?] | null {
	const body = ellipse(x, y, 0, 0, 19, 6.4);
	if (body <= 1) {
		const belly = y > 1 ? 0.14 : -0.06;
		// Overlapping scale arcs ripple back from the gills.
		const scaleArc = x < 9 && Math.abs((Math.hypot(x + 7, y) * 2) % 4.6 - 2.3) < 0.5 ? -0.09 : 0;
		const shade = 0.5 + (1 - body) * 0.22 + belly + scaleArc + (grain(x, y) - 0.5) * 0.08;
		return [tone(FISH, shade)];
	}
	// A small dorsal fin.
	if (ellipse(x, y, 1, -6.8, 4.6, 1.7) <= 1) return [tone(FISH, 0.52), 232];
	if (ellipse(x, y, 14, -1.4, 1.8, 1.8) <= 1) return [EYE_DARK];
	if (ellipse(x, y, 14, -1.4, 1, 1) <= 1) return [EYE_LIGHT];
	if (ellipse(x, y, 12.6, 3.8, 3.4, 2.4) <= 1) return [tone(FISH, 0.72)];
	return null;
}

function paintFishFin(x: number, y: number): [Rgb, number?] | null {
	if (y < 0 || y > 24) return null;
	if (ellipse(x, y, 0, 13, 7.4, 12) > 1) return null;

	if (Math.round(y) % 4 === 0) return [tone(FISH, 0.4), 210];
	return [tone(FISH, 0.62 + (y / 24) * 0.2), 200];
}

function paintFishTail(x: number, y: number): [Rgb, number?] | null {
	if (capsule(x, y, -1, 0, -6, -5, 2.6) <= 1 || capsule(x, y, -1, 0, -6, 5, 2.6) <= 1) {
		return [tone(FISH, 0.58), 240];
	}
	return null;
}

function paintDragonBody(x: number, y: number): [Rgb, number?] | null {
	// A ridge of little dorsal spikes along the back.
	if (y < -4.2 && y > -7 && Math.abs(((x + 11) % 4.4) - 2.2) < 1.1 && ellipse(x, y, -2, 0, 12.4, 7.4) > 1) {
		return [tone(DRAGON, 0.74)];
	}
	const body = ellipse(x, y, -2, 0, 11, 6.4);
	if (body <= 1) {
		const belly = y > 2 ? 0.18 : 0;
		// Segmented belly plates.
		const plate = y > 2.4 && Math.floor((x + 13) / 3.2) % 2 === 0 ? -0.08 : 0;
		const shade = 0.44 + (1 - body) * 0.26 + belly + plate + (grain(x, y) - 0.5) * 0.08;
		return [tone(DRAGON, shade)];
	}
	if (ellipse(x, y, 9, 0, 4.6, 4.4) <= 1) {
		if (ellipse(x, y, 10.4, -1.2, 1, 1) <= 1) return [EYE_DARK];
		return [tone(DRAGON, 0.66)];
	}
	// Horns and a little snout.
	if (capsule(x, y, 8.4, -3.4, 6.4, -6.4, 0.8) <= 1 || capsule(x, y, 8.4, 3.4, 6.4, 6.4, 0.8) <= 1) {
		return [HORN];
	}
	if (capsule(x, y, 12, 0, 15, 0, 1.4) <= 1) return [tone(DRAGON, 0.6)];
	return null;
}

function paintDragonWing(x: number, y: number): [Rgb, number?] | null {
	if (y < 0 || y > 28) return null;
	const chord = 9 - y * 0.14;
	if (Math.abs(x) > chord) return null;

	if (Math.abs(x) < 0.7) return [tone(DRAGON, 0.34)];
	if (Math.round(y) % 5 === 0) return [tone(DRAGON, 0.4)];
	return [tone(DRAGON, 0.55 + (y / 28) * 0.16), 232];
}

function paintDragonTail(x: number, y: number): [Rgb, number?] | null {
	if (capsule(x, y, 0, 0, -10, 0, 2.6 - Math.abs(x) * 0.06) <= 1) return [tone(DRAGON, 0.5)];
	if (ellipse(x, y, -12, 0, 2.6, 3.4) <= 1) return [tone(DRAGON, 0.38)];
	return null;
}

function paintPterosaurBody(x: number, y: number): [Rgb, number?] | null {
	const body = ellipse(x, y, -4, 0, 12.5, 5.2);
	if (body <= 1) {
		const shade = 0.44 + (1 - body) * 0.26 + (grain(x, y) - 0.5) * 0.08;
		return [tone(PTEROSAUR, shade)];
	}
	if (ellipse(x, y, 9.4, -1, 4, 3.4) <= 1) {
		if (ellipse(x, y, 11, -1.4, 0.9, 0.9) <= 1) return [EYE_DARK];
		return [tone(PTEROSAUR, 0.62)];
	}
	// Long pointed beak and the backward head crest.
	if (capsule(x, y, 12, -0.4, 19.4, -1, 1.1) <= 1) return [tone(PTEROSAUR, 0.34)];
	if (capsule(x, y, 7.6, -2.6, 3.6, -6.2, 1.2) <= 1) return [[168, 70, 52]];
	if (Math.abs(y) < 3 && x < -14) return [tone(PTEROSAUR, 0.36)];
	return null;
}

function paintPterosaurWing(x: number, y: number): [Rgb, number?] | null {
	if (y < 0 || y > 40) return null;
	const chord = 11.5 - y * 0.16;
	if (Math.abs(x) > chord) return null;

	// Arm strut plus the long flight finger.
	if (Math.abs(x) < 0.8) return [tone(PTEROSAUR, 0.32)];
	if (capsule(x, y, 0, 0, 8.4, 22, 0.7) <= 1) return [tone(PTEROSAUR, 0.42)];
	// Membrane rays fan back from the wing finger.
	if (capsule(x, y, 8.4, 22, -5.1, 40, 0.45) <= 1 || capsule(x, y, 8.4, 22, 5.1, 40, 0.45) <= 1) {
		return [tone(PTEROSAUR, 0.46), 244];
	}
	if (Math.abs(y - Math.round(y)) < 0.2 && Math.round(y) % 8 === 0) return [tone(PTEROSAUR, 0.38)];
	return [tone(PTEROSAUR, 0.54 + (y / 40) * 0.22), 244];
}

function paintQuetzBody(x: number, y: number): [Rgb, number?] | null {
	const body = ellipse(x, y, -8, 0, 12, 4.6);
	if (body <= 1) {
		const shade = 0.44 + (1 - body) * 0.26 + (grain(x, y) - 0.5) * 0.07;
		return [tone(QUETZ, shade)];
	}
	// Very long neck and beak.
	if (capsule(x, y, 2, 0, 16, -1, 2.2) <= 1) {
		// Ringed neck feathers.
		return x > 3 && x < 14 && Math.round(x) % 3 === 0 ? [tone(QUETZ, 0.44)] : [tone(QUETZ, 0.58)];
	}
	if (ellipse(x, y, 6, -0.4, 3.6, 3.2) <= 1) {
		if (ellipse(x, y, 7.4, -1, 0.9, 0.9) <= 1) return [EYE_DARK];
		return [tone(QUETZ, 0.66)];
	}
	if (capsule(x, y, 17, -1, 26.4, -1.2, 1.1) <= 1) return [tone(QUETZ, 0.36)];
	if (capsule(x, y, 4.4, -2.4, 0.6, -5.6, 1.2) <= 1) return [[152, 58, 46]];
	if (Math.abs(y) < 2.8 && x < -18) return [tone(QUETZ, 0.34)];
	return null;
}

function paintQuetzWing(x: number, y: number): [Rgb, number?] | null {
	if (y < 0 || y > 52) return null;
	const chord = 12 - y * 0.11;
	if (Math.abs(x) > chord) return null;

	if (Math.abs(x) < 0.8) return [tone(QUETZ, 0.3)];
	if (capsule(x, y, 0, 0, 9, 30, 0.65) <= 1) return [tone(QUETZ, 0.4)];
	if (Math.round(y) % 9 === 0) return [tone(QUETZ, 0.36)];
	return [tone(QUETZ, 0.52 + (y / 52) * 0.24), 246];
}

function paintGhostBody(x: number, y: number): [Rgb, number?] | null {
	const sheet = ellipse(x, y, 0, -2, 15, 15);
	if (y > 4) {
		// Ragged, wave-like hem.
		const hem = 12 + Math.sin(x * 0.55) * 3 + Math.sin(x * 0.23 + 1.7) * 2;
		if (y < hem && Math.abs(x) < 15) {
			const shade = 0.62 + (1 - Math.abs(x) / 15) * 0.22 + (grain(x, y) - 0.5) * 0.06;
			return [tone(GHOST, shade), 190];
		}
	}
	if (sheet > 1) return null;

	// A deeper core reads as the ghost's gathered centre.
	const core = ellipse(x, y, -2, -1, 8, 9) <= 1 ? -0.1 : 0;
	const shade = 0.58 + (1 - sheet) * 0.3 + core + (grain(x, y) - 0.5) * 0.05;
	if (ellipse(x, y, 8.4, -2, 1.5, 2) <= 1 || ellipse(x, y, 2, -2, 1.5, 2) <= 1) return [EYE_DARK, 235];
	if (ellipse(x, y, 5, 4.6, 1.6, 1) <= 1) return [mix(GHOST[1] ?? INK, EYE_DARK, 0.4), 220];
	return [tone(GHOST, shade), 185];
}

const builders: Record<CreatureSpecies, () => CreatureArt | null> = {
	butterfly: buildButterfly,
	dragonfly: buildDragonfly,
	bat: buildBat,
	eagle: buildEagle,
	crow: buildCrow,
	parrot: buildParrot,
	cockatoo: buildCockatoo,
	'flying-fish': buildFlyingFish,
	'baby-dragon': buildBabyDragon,
	pterosaur: buildPterosaur,
	quetzalcoatlus: buildQuetzalcoatlus,
	ghost: buildGhost
};

const cache = new Map<CreatureSpecies, CreatureArt>();

/** Built once per species and reused by every creature on the page. */
export function getCreatureArt(species: CreatureSpecies): CreatureArt | null {
	const existing = cache.get(species);
	if (existing) return existing;
	const built = builders[species]();
	if (!built) return null;
	// The painters work in logical sprite units; renderSprite doubled the canvas,
	// so every anchor scales with it.
	const scaled: CreatureArt = {
		...built,
		bodyW: built.bodyW * SPRITE_SCALE,
		bodyH: built.bodyH * SPRITE_SCALE,
		wingW: built.wingW * SPRITE_SCALE,
		wingH: built.wingH * SPRITE_SCALE,
		hingeX: built.hingeX * SPRITE_SCALE,
		hingeY: built.hingeY * SPRITE_SCALE,
		tailX: built.tailX * SPRITE_SCALE,
		tailY: built.tailY * SPRITE_SCALE,
		crestX: built.crestX * SPRITE_SCALE,
		crestY: built.crestY * SPRITE_SCALE
	};
	cache.set(species, scaled);
	return scaled;
}

type Box = { minX: number; minY: number; maxX: number; maxY: number };

export type CreatureBounds = Box & { width: number; height: number };

const pixelBoundsCache = new WeakMap<HTMLCanvasElement, Box | null>();
const boundsCache = new WeakMap<CreatureArt, CreatureBounds>();

/** The opaque area of a sprite, so transparent padding never skews its size. */
function canvasPixelBounds(canvas: HTMLCanvasElement): Box | null {
	const cached = pixelBoundsCache.get(canvas);
	if (cached !== undefined) return cached;

	const context = canvas.getContext('2d');
	if (!context) {
		pixelBoundsCache.set(canvas, null);
		return null;
	}

	const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
	let minX = canvas.width;
	let minY = canvas.height;
	let maxX = -1;
	let maxY = -1;

	for (let y = 0; y < canvas.height; y += 1) {
		for (let x = 0; x < canvas.width; x += 1) {
			if ((data[(y * canvas.width + x) * 4 + 3] ?? 0) <= 8) continue;
			if (x < minX) minX = x;
			if (x > maxX) maxX = x;
			if (y < minY) minY = y;
			if (y > maxY) maxY = y;
		}
	}

	const box = maxX < 0 ? null : { minX, minY, maxX, maxY };
	pixelBoundsCache.set(canvas, box);
	return box;
}

/**
 * Visible bounds of a creature around its own anchor, in art pixels. Wings are
 * measured in their widest pose and mirrored, since the left wing is a flip.
 */
export function creatureBounds(art: CreatureArt): CreatureBounds {
	const cached = boundsCache.get(art);
	if (cached) return cached;

	const boxes: Box[] = [];
	const body = canvasPixelBounds(art.body);
	if (body) {
		boxes.push({
			minX: -art.bodyW / 2 + body.minX,
			maxX: -art.bodyW / 2 + body.maxX,
			minY: -art.bodyH / 2 + body.minY,
			maxY: -art.bodyH / 2 + body.maxY
		});
	}

	const wing = art.wing ? canvasPixelBounds(art.wing) : null;
	if (wing && art.wing) {
		const left = art.hingeX - art.wingW / 2;
		boxes.push({
			minX: left + wing.minX,
			maxX: left + wing.maxX,
			minY: art.hingeY - wing.maxY,
			maxY: art.hingeY - wing.minY
		});
	}

	const tail = art.tail ? canvasPixelBounds(art.tail) : null;
	if (tail && art.tail) {
		boxes.push({
			minX: art.tailX - art.tail.width + tail.minX,
			maxX: art.tailX - art.tail.width + tail.maxX,
			minY: art.tailY - art.tail.height / 2 + tail.minY,
			maxY: art.tailY - art.tail.height / 2 + tail.maxY
		});
	}

	const crest = art.crest ? canvasPixelBounds(art.crest) : null;
	if (crest && art.crest) {
		boxes.push({
			minX: art.crestX - art.crest.width / 2 + crest.minX,
			maxX: art.crestX - art.crest.width / 2 + crest.maxX,
			minY: art.crestY - art.crest.height + crest.minY,
			maxY: art.crestY - art.crest.height + crest.maxY
		});
	}

	const fallback: Box = {
		minX: -art.bodyW / 2,
		maxX: art.bodyW / 2,
		minY: -art.bodyH / 2,
		maxY: art.bodyH / 2
	};
	const first = boxes[0] ?? fallback;

	let minX = first.minX;
	let minY = first.minY;
	let maxX = first.maxX;
	let maxY = first.maxY;
	for (const box of boxes) {
		minX = Math.min(minX, box.minX);
		minY = Math.min(minY, box.minY);
		maxX = Math.max(maxX, box.maxX);
		maxY = Math.max(maxY, box.maxY);
	}

	const bounds: CreatureBounds = { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
	boundsCache.set(art, bounds);
	return bounds;
}

function buildButterfly(): CreatureArt | null {
	// The Great Mormon: cream forewings with black veins and spotted margins,
	// red hindwing spots, swallowtail tails, and a slender dark body.
	const body = renderSprite(48, 18, 24, 9, paintButterflyBody);
	const wing = renderSprite(56, 26, 28, 0, paintButterflyWing);
	if (!body || !wing) return null;
	return {
		body,
		bodyW: 48,
		bodyH: 18,
		wing,
		wingW: 56,
		wingH: 26,
		hingeX: 0,
		hingeY: 0,
		tail: null,
		tailX: 0,
		tailY: 0,
		crest: null,
		crestX: 0,
		crestY: 0,
		alpha: 1,
		glow: false
	};
}

function buildDragonfly(): CreatureArt | null {
	// Long striped abdomen, and the four-panel sunset wings hinged slightly
	// forward of centre.
	const body = renderSprite(44, 14, 30, 7, paintDragonflyBody);
	const wing = renderSprite(28, 32, 14, 0, paintDragonflyWing);
	if (!body || !wing) return null;
	return {
		body,
		bodyW: 44,
		bodyH: 14,
		wing,
		wingW: 28,
		wingH: 32,
		hingeX: 2,
		hingeY: 0,
		tail: null,
		tailX: 0,
		tailY: 0,
		crest: null,
		crestX: 0,
		crestY: 0,
		alpha: 1,
		glow: false
	};
}

function buildBat(): CreatureArt | null {
	// The broad, scalloped membrane spans forward and back of the shoulders.
	const body = renderSprite(32, 12, 16, 6, paintBatBody);
	const wing = renderSprite(36, 30, 18, 0, paintBatWing);
	if (!body || !wing) return null;
	return {
		body,
		bodyW: 32,
		bodyH: 12,
		wing,
		wingW: 36,
		wingH: 30,
		hingeX: 0,
		hingeY: 0,
		tail: null,
		tailX: 0,
		tailY: 0,
		crest: null,
		crestX: 0,
		crestY: 0,
		alpha: 1,
		glow: false
	};
}

function buildEagle(): CreatureArt | null {
	// White head, yellow beak, brown body and the white fan tail — with the
	// long, deep flight wings reaching forward and back of the shoulders.
	const body = renderSprite(58, 16, 29, 8, paintEagleBody);
	const wing = renderSprite(30, 36, 15, 0, paintEagleWing);
	if (!body || !wing) return null;
	return {
		body,
		bodyW: 58,
		bodyH: 16,
		wing,
		wingW: 30,
		wingH: 36,
		hingeX: 1,
		hingeY: 0,
		tail: null,
		tailX: 0,
		tailY: 0,
		crest: null,
		crestX: 0,
		crestY: 0,
		alpha: 1,
		glow: false
	};
}

function buildCrow(): CreatureArt | null {
	// Raven from above: layered fingered wings, fanned tail, sturdy beak.
	const body = renderSprite(48, 14, 24, 7, paintCrowBody);
	const wing = renderSprite(28, 34, 14, 0, paintCrowWing);
	if (!body || !wing) return null;
	return {
		body,
		bodyW: 48,
		bodyH: 14,
		wing,
		wingW: 28,
		wingH: 34,
		hingeX: 0,
		hingeY: 0,
		tail: null,
		tailX: 0,
		tailY: 0,
		crest: null,
		crestX: 0,
		crestY: 0,
		alpha: 1,
		glow: false
	};
}

function buildParrot(): CreatureArt | null {
	// Scarlet body, yellow crown, scalloped wing with blue flight feathers,
	// and the long graduated tail trailing behind.
	const body = renderSprite(34, 16, 17, 8, paintParrotBody);
	const wing = renderSprite(22, 32, 11, 0, paintParrotWing);
	const tail = renderSprite(32, 12, 16, 6, paintParrotTail);
	if (!body || !wing || !tail) return null;
	return {
		body,
		bodyW: 34,
		bodyH: 16,
		wing,
		wingW: 22,
		wingH: 32,
		hingeX: 0,
		hingeY: 0,
		tail,
		tailX: -6,
		tailY: 0,
		crest: null,
		crestX: 0,
		crestY: 0,
		alpha: 1,
		glow: false
	};
}

function buildCockatoo(): CreatureArt | null {
	const body = renderSprite(28, 20, 14, 10, paintCockatooBody);
	const wing = renderSprite(20, 32, 10, 0, paintCockatooWing);
	const crest = renderSprite(14, 18, 7, 18, paintCockatooCrest);
	if (!body || !wing || !crest) return null;
	return {
		body,
		bodyW: 28,
		bodyH: 20,
		wing,
		wingW: 20,
		wingH: 32,
		hingeX: 0,
		hingeY: 0,
		tail: null,
		tailX: 0,
		tailY: 0,
		crest,
		crestX: 7,
		crestY: -3,
		alpha: 1,
		glow: false
	};
}

function buildFlyingFish(): CreatureArt | null {
	const body = renderSprite(50, 20, 25, 10, paintFishBody);
	const wing = renderSprite(16, 24, 8, 0, paintFishFin);
	const tail = renderSprite(14, 16, 7, 8, paintFishTail);
	if (!body || !wing || !tail) return null;
	return {
		body,
		bodyW: 50,
		bodyH: 20,
		wing,
		wingW: 16,
		wingH: 24,
		hingeX: 2,
		hingeY: 0,
		tail,
		tailX: -20,
		tailY: 0,
		crest: null,
		crestX: 0,
		crestY: 0,
		alpha: 1,
		glow: false
	};
}

function buildBabyDragon(): CreatureArt | null {
	const body = renderSprite(34, 22, 17, 11, paintDragonBody);
	const wing = renderSprite(18, 28, 9, 0, paintDragonWing);
	const tail = renderSprite(28, 12, 14, 6, paintDragonTail);
	if (!body || !wing || !tail) return null;
	return {
		body,
		bodyW: 34,
		bodyH: 22,
		wing,
		wingW: 18,
		wingH: 28,
		hingeX: 0,
		hingeY: 0,
		tail,
		tailX: -11,
		tailY: 0,
		crest: null,
		crestX: 0,
		crestY: 0,
		alpha: 1,
		glow: false
	};
}

function buildPterosaur(): CreatureArt | null {
	const body = renderSprite(44, 18, 22, 9, paintPterosaurBody);
	const wing = renderSprite(22, 40, 11, 0, paintPterosaurWing);
	if (!body || !wing) return null;
	return {
		body,
		bodyW: 44,
		bodyH: 18,
		wing,
		wingW: 22,
		wingH: 40,
		hingeX: 0,
		hingeY: 0,
		tail: null,
		tailX: 0,
		tailY: 0,
		crest: null,
		crestX: 0,
		crestY: 0,
		alpha: 1,
		glow: false
	};
}

function buildQuetzalcoatlus(): CreatureArt | null {
	const body = renderSprite(62, 18, 31, 9, paintQuetzBody);
	const wing = renderSprite(24, 52, 12, 0, paintQuetzWing);
	if (!body || !wing) return null;
	return {
		body,
		bodyW: 62,
		bodyH: 18,
		wing,
		wingW: 24,
		wingH: 52,
		hingeX: 0,
		hingeY: 0,
		tail: null,
		tailX: 0,
		tailY: 0,
		crest: null,
		crestX: 0,
		crestY: 0,
		alpha: 1,
		glow: false
	};
}

function buildGhost(): CreatureArt | null {
	const body = renderSprite(38, 44, 19, 22, paintGhostBody, null);
	if (!body) return null;
	return {
		body,
		bodyW: 38,
		bodyH: 44,
		wing: null,
		wingW: 0,
		wingH: 0,
		hingeX: 0,
		hingeY: 0,
		tail: null,
		tailX: 0,
		tailY: 0,
		crest: null,
		crestX: 0,
		crestY: 0,
		alpha: 0.78,
		glow: true
	};
}
