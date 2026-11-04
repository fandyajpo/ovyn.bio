import type { CreatureSpecies } from '#lib/schemas/creatures';

export type Rgb = readonly [number, number, number];

type SpritePaint = (x: number, y: number) => [Rgb, number?] | null;

const INK: Rgb = [20, 17, 14];

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
				}
				if (!target || amount === 0) continue;

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

// ---------------------------------------------------------------------------
// The landing butterfly, ported. Its wing and body painters are the quality
// bar every species in this flock aims at, so the monarch itself joins it.
// ---------------------------------------------------------------------------

const MONARCH_WING_INK: Rgb = [34, 22, 12];
const MONARCH_WING_DARK: Rgb = [154, 64, 24];
const MONARCH_WING_MID: Rgb = [214, 104, 40];
const MONARCH_WING_LIGHT: Rgb = [244, 146, 66];
const MONARCH_WING_PALE: Rgb = [255, 186, 112];
const MONARCH_WING_SPOT: Rgb = [255, 232, 190];
const MONARCH_VEIN_ANGLES = [-1.15, -0.85, -0.55, -0.28, 0.02, 0.32, 0.62];
const MONARCH_WING_SPOTS: Array<[number, number]> = [
	[20, -0.95],
	[22, -0.62],
	[18, -1.18],
	[15, 0.38],
	[18, 0.66],
	[11, -0.18]
];
const MONARCH_BODY_TONE: Rgb = [62, 40, 22];
const MONARCH_BODY_DARK: Rgb = [38, 24, 14];
const MONARCH_BODY_LIGHT: Rgb = [112, 74, 40];

/** The landing butterfly's wing: two lobes around the hinge, in hinge-relative units. */
function monarchWing(x: number, ly: number): [Rgb, number?] | null {
	if (!insideMonarchWing(x, ly)) return null;

	const edge =
		!insideMonarchWing(x - 1, ly) || !insideMonarchWing(x + 1, ly) || !insideMonarchWing(x, ly - 1) || !insideMonarchWing(x, ly + 1);
	if (edge) return [MONARCH_WING_INK];

	const radius = Math.hypot(x, ly);
	const angle = Math.atan2(ly, x);
	const fore = ellipse(x, ly, 17, -12, 20, 12, -0.4);
	const hind = ellipse(x, ly, 12, 6, 15, 11, 0.3);

	let base: Rgb = radius < 9 ? MONARCH_WING_DARK : radius < 17 ? MONARCH_WING_MID : MONARCH_WING_LIGHT;

	// Veins radiate from the hinge, fanning across the wing.
	if (radius > 5 && MONARCH_VEIN_ANGLES.some((candidate) => Math.abs(deltaAround(angle, candidate)) < 0.028)) {
		return [mix(MONARCH_WING_INK, [255, 250, 240], 0.14)];
	}

	// Concentric scale bands give the wing its layered texture.
	const band = (radius - 6) % 6.5;
	if (radius > 8 && band >= 0 && band < 0.6) base = mix(base, MONARCH_WING_DARK, 0.16);

	// Cream spots ringed along the wing edge.
	for (const [spotRadius, spotAngle] of MONARCH_WING_SPOTS) {
		if (Math.abs(radius - spotRadius) < 1.4 && Math.abs(deltaAround(angle, spotAngle)) < 0.1) {
			return [MONARCH_WING_SPOT];
		}
	}

	if (hind <= 1 && fore > 1) base = mix(base, MONARCH_WING_DARK, 0.08);
	if (ly < -4 && grain(x, ly) > 0.87) base = MONARCH_WING_PALE;
	if (radius > 23 && grain(x, ly) > 0.55) base = mix(base, [255, 250, 240], 0.12);
	if (grain(x, ly) > 0.94) base = mix(base, MONARCH_WING_DARK, 0.1);

	return [base];
}

function insideMonarchWing(x: number, ly: number) {
	return (
		ellipse(x, ly, 17, -12, 20, 12, -0.4) <= 1 || ellipse(x, ly, 12, 6, 15, 11, 0.3) <= 1
	);
}

function paintButterflyWing(x: number, y: number): [Rgb, number?] | null {
	// The landing wing spans ±28 around its hinge; the sprite canvas starts at
	// the hinge, so the shape sits shifted down (fore lobe near the top, hind
	// lobe below) and the engine folds it around the creature's centre line.
	return monarchWing(x + 20, y - 28);
}

function segHit(x: number, y: number, x0: number, y0: number, x1: number, y1: number): boolean {
	const dx = x1 - x0;
	const dy = y1 - y0;
	const lengthSq = dx * dx + dy * dy;
	const t = lengthSq === 0 ? 0 : clamp(((x - x0) * dx + (y - y0) * dy) / lengthSq, 0, 1);
	return Math.hypot(x - (x0 + dx * t), y - (y0 + dy * t)) <= 0.6;
}

/**
 * The landing body, rotated into flight orientation: the landing builds it
 * head-up, so landing (x, y) maps to sprite (y, -x) — antennae forward,
 * abdomen trailing, wings attaching along the dorsal centre line.
 */
function paintButterflyBody(x: number, y: number): [Rgb, number?] | null {
	const ly = -x;
	const lx = y;

	// Abdomen: tapering segments with visible rings.
	if (ly >= 6 && ly <= 24) {
		const half = Math.max(1, Math.round(4 - ((ly - 6) / 18) * 2.6));
		if (Math.abs(lx) <= half) {
			const rim = Math.abs(lx) === half || ly === 24;
			const ring = ly % 4 === 0;
			const fuzz = grain(ly, lx) > 0.7;
			return [rim ? MONARCH_BODY_DARK : ring || fuzz ? MONARCH_BODY_LIGHT : MONARCH_BODY_TONE, 1];
		}
		return null;
	}

	// Thorax: the fuzzy middle the wings attach to.
	if (ly >= -6 && ly <= 6) {
		const half = ly < -3 || ly > 3 ? 4 : 5;
		if (Math.abs(lx) <= half) {
			const rim = Math.abs(lx) === half;
			return [rim ? MONARCH_BODY_DARK : grain(ly, lx) > 0.7 ? MONARCH_BODY_LIGHT : MONARCH_BODY_TONE, 1];
		}
		return null;
	}

	// Head and compound eyes.
	if (ly >= -15 && ly <= -6) {
		const half = ly < -13 || ly > -8 ? 2 : 4;
		if (Math.abs(lx) <= half) {
			if (ly === -12 && Math.abs(lx) === 2) return [MONARCH_WING_SPOT, 1];
			if (ly === -11 && Math.abs(lx) === 2) return [MONARCH_BODY_DARK, 1];
			return [Math.abs(lx) === half ? MONARCH_BODY_DARK : MONARCH_BODY_TONE, 1];
		}
		return null;
	}

	// Antennae: two segments each, curving outward, with tiny clubs.
	for (const side of [-1, 1] as const) {
		if (segHit(x, y, 14, side, 21, side * 4) || segHit(x, y, 21, side * 4, 26, side * 9)) {
			return [MONARCH_BODY_DARK, 1];
		}
		if (Math.hypot(x - 26, y - side * 9) <= 1.1) return [MONARCH_WING_SPOT, 1];
	}

	// Six delicate legs trailing beneath the body.
	for (const side of [-1, 1] as const) {
		for (const [a, b, c, d] of [
			[3, 4, -3, 9],
			[-1, 5, -9, 10],
			[-5, 4, -13, 8]
		] as const) {
			if (segHit(x, y, a, side * b, c, side * d)) return [MONARCH_BODY_DARK, 1];
		}
	}

	return null;
}

function deltaAround(a: number, b: number) {
	return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

const builders: Record<CreatureSpecies, () => CreatureArt | null> = {
	butterfly: buildButterfly
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
	// The landing monarch: a 64-unit body with antennae, fuzz and ringed
	// abdomen, and the two-lobed 40×56 wing with veins, bands and spots.
	const body = renderSprite(52, 30, 26, 15, paintButterflyBody);
	const wing = renderSprite(40, 56, 20, 28, paintButterflyWing);
	if (!body || !wing) return null;
	return {
		body,
		bodyW: 52,
		bodyH: 30,
		wing,
		wingW: 40,
		wingH: 56,
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
