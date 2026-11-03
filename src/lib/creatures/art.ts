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

function renderSprite(
	width: number,
	height: number,
	originX: number,
	originY: number,
	paint: SpritePaint,
	outline: Rgb | null = INK
): HTMLCanvasElement | null {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext('2d');
	if (!context) return null;

	const image = context.createImageData(width, height);
	const filled = new Uint8Array(width * height);

	for (let py = 0; py < height; py += 1) {
		for (let px = 0; px < width; px += 1) {
			const hit = paint(px + 0.5 - originX, py + 0.5 - originY);
			if (!hit) continue;
			const offset = (py * width + px) * 4;
			const colour = hit[0];
			image.data[offset] = colour[0];
			image.data[offset + 1] = colour[1];
			image.data[offset + 2] = colour[2];
			image.data[offset + 3] = hit[1] ?? 255;
			filled[py * width + px] = 1;
		}
	}

	if (outline) {
		for (let py = 0; py < height; py += 1) {
			for (let px = 0; px < width; px += 1) {
				const index = py * width + px;
				if (!filled[index]) continue;
				const edge =
					px === 0 ||
					py === 0 ||
					px === width - 1 ||
					py === height - 1 ||
					!filled[index - 1] ||
					!filled[index + 1] ||
					!filled[index - width] ||
					!filled[index + width];
				if (!edge) continue;
				const offset = index * 4;
				image.data[offset] = outline[0];
				image.data[offset + 1] = outline[1];
				image.data[offset + 2] = outline[2];
				image.data[offset + 3] = 255;
			}
		}

		// A second pass adds volume: a warm rim on the lit side, a cool contact
		// edge on the shadow side, and a soft inner occlusion band.
		const filledAt = (px: number, py: number) =>
			px >= 0 && py >= 0 && px < width && py < height && filled[py * width + px] === 1;

		for (let py = 0; py < height; py += 1) {
			for (let px = 0; px < width; px += 1) {
				const index = py * width + px;
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

const MONARCH: Palette = [
	[68, 30, 12],
	[118, 46, 14],
	[168, 74, 20],
	[204, 104, 32],
	[232, 138, 58],
	[248, 178, 102]
];
const MONARCH_BODY: Palette = [
	[34, 24, 18],
	[52, 36, 24],
	[74, 50, 30],
	[96, 64, 36]
];
const DRAGONFLY_BODY: Palette = [
	[20, 42, 48],
	[30, 68, 76],
	[44, 98, 106],
	[64, 132, 134],
	[104, 168, 160],
	[168, 206, 188]
];
const DRAGONFLY_WING: Palette = [
	[92, 136, 150],
	[124, 172, 182],
	[160, 200, 202],
	[198, 224, 220],
	[228, 240, 232]
];
const BAT_BODY: Palette = [
	[20, 17, 26],
	[34, 28, 42],
	[52, 42, 58],
	[74, 58, 74],
	[98, 76, 84],
	[132, 100, 100]
];
const EAGLE_BODY: Palette = [
	[38, 26, 16],
	[60, 40, 22],
	[88, 58, 30],
	[120, 80, 42],
	[156, 108, 60],
	[196, 148, 94]
];
const EAGLE_HEAD: Palette = [
	[176, 168, 148],
	[208, 202, 182],
	[230, 226, 208],
	[244, 242, 232],
	[252, 250, 244]
];
const CROW: Palette = [
	[12, 14, 20],
	[20, 24, 32],
	[30, 36, 48],
	[44, 52, 68],
	[64, 74, 92],
	[96, 108, 128]
];
const PARROT: Palette = [
	[74, 14, 24],
	[118, 20, 32],
	[164, 28, 40],
	[198, 50, 52],
	[226, 92, 84],
	[246, 144, 122]
];
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
const CREAM: Rgb = [238, 224, 186];
const HORN: Rgb = [222, 208, 174];
const BEAK: Rgb = [226, 168, 58];

function paintButterflyBody(x: number, y: number): [Rgb, number?] | null {
	if (ellipse(x, y, -2, 0, 16, 4.2) <= 1) {
		const seg = Math.sin(x * 1.4) > 0.3 ? 0.12 : 0;
		const shade = 0.42 + (1 - Math.abs(y) / 4.2) * 0.34 + seg + (grain(x, y) - 0.5) * 0.08;
		return [tone(MONARCH_BODY, shade)];
	}
	if (ellipse(x, y, 15, 0, 3.4, 3.4) <= 1) return [tone(MONARCH_BODY, 0.7)];
	if (capsule(x, y, 14, -1.6, 21, -7.4, 0.6) <= 1) return [tone(MONARCH_BODY, 0.5)];
	if (capsule(x, y, 14, 1.6, 21, 7.4, 0.6) <= 1) return [tone(MONARCH_BODY, 0.5)];
	return null;
}

function paintButterflyWing(x: number, y: number): [Rgb, number?] | null {
	const fore = ellipse(x, y, 1.5, 11, 12.4, 13, -0.22);
	const hind = ellipse(x, y, -3.5, 21, 8.6, 8.2, 0.12);
	if (fore > 1 && hind > 1) return null;

	const score = Math.min(fore, hind);
	const radius = Math.hypot(x, y);
	const angle = Math.atan2(y, x);

	// Dark veins fan out from the hinge.
	for (let index = 0; index < 7; index += 1) {
		const vein = -1.05 + index * 0.32;
		const delta = Math.atan2(Math.sin(angle - vein), Math.cos(angle - vein));
		if (radius > 3 && Math.abs(delta) < 0.045) return [MONARCH_BODY[0] ?? INK];
	}

	let shade = 0.5 + (1 - score) * 0.32 - radius * 0.012;
	if (hind <= 1 && fore > 1) shade -= 0.08;
	if (radius > 18 && grain(x, y) > 0.86) shade += 0.1;
	if (grain(x, y) > 0.95) shade -= 0.08;

	const colour = tone(MONARCH, shade);
	// Creamy spots near the outer edge.
	if (radius > 13 && Math.abs(deltaAround(angle, 0.5)) < 0.12) return [CREAM];
	return [colour];
}

function deltaAround(a: number, b: number) {
	return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

function paintDragonflyBody(x: number, y: number): [Rgb, number?] | null {
	const abdomen = capsule(x, y, -21, 0, 7, 0, 2.9);
	if (abdomen <= 1) {
		const ring = Math.floor((x + 21) / 3.4) % 2 === 0 ? 0.08 : 0;
		const shade = 0.5 + (1 - abdomen) * 0.2 + ring + (grain(x, y) - 0.5) * 0.06;
		return [tone(DRAGONFLY_BODY, shade)];
	}
	if (ellipse(x, y, 10, 0, 5.4, 4.6) <= 1) return [tone(DRAGONFLY_BODY, 0.62)];
	if (ellipse(x, y, 17, 0, 4.6, 4.2) <= 1) {
		if (ellipse(x, y, 18, -1.4, 2.1, 1.9) <= 1 || ellipse(x, y, 18, 1.4, 2.1, 1.9) <= 1) {
			return [[104, 40, 34]];
		}
		return [tone(DRAGONFLY_BODY, 0.7)];
	}
	return null;
}

function paintDragonflyWing(x: number, y: number): [Rgb, number?] | null {
	const fore = ellipse(x, y, 0, 11, 10.5, 12.5);
	const hind = ellipse(x, y, 0, 31, 9, 14);
	if (fore > 1 && hind > 1) return null;

	// Fine cross veins make the membrane read as glass.
	if (Math.abs(x) > 7 || (Math.round(y) % 5 === 0 && Math.abs(x) < 6)) {
		return [DRAGONFLY_WING[1] ?? INK, 190];
	}
	return [tone(DRAGONFLY_WING, 0.55 + grain(x, y) * 0.35), 170];
}

function paintBatBody(x: number, y: number): [Rgb, number?] | null {
	if (ellipse(x, y, 0, 0, 8.4, 6.4) <= 1) {
		const shade = 0.42 + (1 - ellipse(x, y, 0, 0, 8.4, 6.4)) * 0.3 + (grain(x, y) - 0.5) * 0.12;
		return [tone(BAT_BODY, shade)];
	}
	if (ellipse(x, y, 6.4, 0, 3.6, 3.4) <= 1) {
		if (ellipse(x, y, 8.4, -0.8, 0.9, 0.9) <= 1 || ellipse(x, y, 8.4, 1.6, 0.9, 0.9) <= 1) return [EYE_DARK];
		return [tone(BAT_BODY, 0.62)];
	}
	// Tall ears.
	if (ellipse(x, y, 4.6, -5, 1.9, 4.4, -0.25) <= 1 || ellipse(x, y, 4.6, 5, 1.9, 4.4, 0.25) <= 1) {
		return [tone(BAT_BODY, 0.76)];
	}
	// Tiny feet trailing behind.
	if (capsule(x, y, -7, -2.6, -10, -4.4, 0.7) <= 1 || capsule(x, y, -7, 2.6, -10, 4.4, 0.7) <= 1) {
		return [tone(BAT_BODY, 0.5)];
	}
	return null;
}

function paintBatWing(x: number, y: number): [Rgb, number?] | null {
	if (y < 0 || y > 26) return null;
	if (ellipse(x, y, 0, 15, 9.6, 12) > 1) return null;

	// Finger struts.
	if (Math.abs(x) < 0.6 || capsule(x, y, 0, 0, 5.4, 22, 0.6) <= 1 || capsule(x, y, 0, 0, -5.4, 22, 0.6) <= 1) {
		return [tone(BAT_BODY, 0.34)];
	}

	const shade = 0.5 - Math.abs(x) * 0.012 + (1 - ellipse(x, y, 0, 15, 9.6, 12)) * 0.16;
	return [tone(BAT_BODY, shade), 236];
}

function paintEagleBody(x: number, y: number): [Rgb, number?] | null {
	const body = ellipse(x, y, -4, 0, 12.5, 5.4);
	if (body <= 1) {
		const shade = 0.44 + (1 - body) * 0.22 + (grain(x, y) - 0.5) * 0.1;
		return [tone(EAGLE_BODY, shade)];
	}
	// White head and hooked beak.
	if (ellipse(x, y, 11, -1.6, 5.4, 4.6) <= 1) {
		if (ellipse(x, y, 13.4, -2.4, 1, 1) <= 1) return [EYE_DARK];
		return [tone(EAGLE_HEAD, 0.55 + (1 - ellipse(x, y, 11, -1.6, 5.4, 4.6)) * 0.35)];
	}
	if (capsule(x, y, 15.4, -0.4, 18.6, -1.8, 1.1) <= 1) return [BEAK];
	// White wedge tail.
	if (Math.abs(y) < 4.6 && x > -22 && x < -12) return [tone(EAGLE_HEAD, 0.6)];
	if (capsule(x, y, -10, -3, -10, 3, 1.4) <= 1) return [tone(EAGLE_HEAD, 0.5)];
	return null;
}

function paintEagleWing(x: number, y: number): [Rgb, number?] | null {
	if (y < 0 || y > 38) return null;
	// Broad, swept wing with feather scallops on the trailing edge.
	const span = (y - 6) * 0.12;
	const chord = 13 - y * 0.2;
	if (y < 6) {
		if (ellipse(x, y, 0, 4, 10, 7) > 1) return null;
	} else if (Math.abs(x + span) > chord || y > 34 + Math.sin(x * 0.9) * 2.2) {
		return null;
	}

	// Feather rows.
	const row = Math.floor(y / 4.4);
	const shade = 0.38 + (y / 38) * 0.3 + (row % 2 === 0 ? 0.06 : -0.04) + (grain(x, y) - 0.5) * 0.08;
	const colour = tone(EAGLE_BODY, shade);
	if (y > 30) return [mix(colour, EAGLE_BODY[0] ?? INK, 0.45)];
	return [colour];
}

function paintCrowBody(x: number, y: number): [Rgb, number?] | null {
	if (ellipse(x, y, -3, 0, 11.4, 4.8) <= 1) {
		const sheen = Math.sin(x * 0.7 + y * 0.4) > 0.55 ? 0.1 : 0;
		const shade = 0.42 + (1 - ellipse(x, y, -3, 0, 11.4, 4.8)) * 0.24 + sheen;
		return [tone(CROW, shade)];
	}
	if (ellipse(x, y, 9.4, 0, 4, 3.8) <= 1) {
		if (ellipse(x, y, 11, -1.2, 0.9, 0.9) <= 1) return [EYE_LIGHT];
		return [tone(CROW, 0.5)];
	}
	if (capsule(x, y, 12, 0, 15.6, 0, 1) <= 1) return [tone(CROW, 0.24)];
	if (Math.abs(y) < 3.6 && x < -12) return [tone(CROW, 0.32)];
	return null;
}

function paintCrowWing(x: number, y: number): [Rgb, number?] | null {
	if (y < 0 || y > 32) return null;
	const chord = 10 - y * 0.12;
	if (Math.abs(x) > chord) return null;

	const row = Math.floor(y / 4);
	const sheen = Math.sin(x * 0.5 + y * 0.3) > 0.6 ? 0.08 : 0;
	const shade = 0.36 + (y / 32) * 0.26 + (row % 2 ? -0.03 : 0.05) + sheen;
	return [tone(CROW, shade)];
}

function paintParrotBody(x: number, y: number): [Rgb, number?] | null {
	if (ellipse(x, y, -3, 0, 10.4, 5.2) <= 1) {
		const shade = 0.46 + (1 - ellipse(x, y, -3, 0, 10.4, 5.2)) * 0.28 + (grain(x, y) - 0.5) * 0.07;
		return [tone(PARROT, shade)];
	}
	// Pale face patch and dark beak.
	if (ellipse(x, y, 8, -0.6, 3.6, 3.4) <= 1) {
		if (ellipse(x, y, 9.4, -1.2, 0.9, 0.9) <= 1) return [EYE_DARK];
		return [[232, 224, 208]];
	}
	if (capsule(x, y, 10.4, 0.4, 13.4, -1, 1.2) <= 1) return [[38, 34, 32]];
	return null;
}

function paintParrotWing(x: number, y: number): [Rgb, number?] | null {
	if (y < 0 || y > 30) return null;
	const chord = 9.4 - y * 0.12;
	if (Math.abs(x) > chord) return null;

	if (y < 8) return [[244, 198, 62]];
	if (y > 22) return [[64, 104, 168]];
	const row = Math.floor(y / 4);
	const shade = 0.44 + (y / 30) * 0.3 + (row % 2 ? -0.04 : 0.06);
	return [tone(PARROT, shade)];
}

function paintParrotTail(x: number, y: number): [Rgb, number?] | null {
	if (ellipse(x, y, -6, 0, 12, 4.4) > 1) return null;
	if (x < -12) return [[64, 104, 168]];
	return [tone(PARROT, 0.52 + (x + 18) * 0.02)];
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
	return [[244, 206, 74]];
}

function paintFishBody(x: number, y: number): [Rgb, number?] | null {
	const body = ellipse(x, y, 0, 0, 19, 6.4);
	if (body <= 1) {
		const belly = y > 1 ? 0.14 : -0.06;
		const shade = 0.5 + (1 - body) * 0.22 + belly + (grain(x, y) - 0.5) * 0.08;
		return [tone(FISH, shade)];
	}
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
	const body = ellipse(x, y, -2, 0, 11, 6.4);
	if (body <= 1) {
		const belly = y > 2 ? 0.18 : 0;
		const shade = 0.44 + (1 - body) * 0.26 + belly + (grain(x, y) - 0.5) * 0.08;
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
	if (capsule(x, y, 2, 0, 16, -1, 2.2) <= 1) return [tone(QUETZ, 0.58)];
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

	const shade = 0.58 + (1 - sheet) * 0.3 + (grain(x, y) - 0.5) * 0.05;
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
	cache.set(species, built);
	return built;
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
	const body = renderSprite(44, 18, 22, 9, paintButterflyBody);
	const wing = renderSprite(26, 28, 13, 0, paintButterflyWing);
	if (!body || !wing) return null;
	return {
		body,
		bodyW: 44,
		bodyH: 18,
		wing,
		wingW: 26,
		wingH: 28,
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
	const body = renderSprite(46, 16, 23, 8, paintDragonflyBody);
	const wing = renderSprite(26, 46, 13, 0, paintDragonflyWing);
	if (!body || !wing) return null;
	return {
		body,
		bodyW: 46,
		bodyH: 16,
		wing,
		wingW: 26,
		wingH: 46,
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
	const body = renderSprite(26, 22, 13, 11, paintBatBody);
	const wing = renderSprite(20, 26, 10, 0, paintBatWing);
	if (!body || !wing) return null;
	return {
		body,
		bodyW: 26,
		bodyH: 22,
		wing,
		wingW: 20,
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

function buildEagle(): CreatureArt | null {
	const body = renderSprite(42, 22, 21, 11, paintEagleBody);
	const wing = renderSprite(22, 38, 11, 0, paintEagleWing);
	if (!body || !wing) return null;
	return {
		body,
		bodyW: 42,
		bodyH: 22,
		wing,
		wingW: 22,
		wingH: 38,
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
	const body = renderSprite(36, 18, 18, 9, paintCrowBody);
	const wing = renderSprite(20, 32, 10, 0, paintCrowWing);
	if (!body || !wing) return null;
	return {
		body,
		bodyW: 36,
		bodyH: 18,
		wing,
		wingW: 20,
		wingH: 32,
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
	const body = renderSprite(30, 16, 15, 8, paintParrotBody);
	const wing = renderSprite(18, 30, 9, 0, paintParrotWing);
	const tail = renderSprite(26, 12, 13, 6, paintParrotTail);
	if (!body || !wing || !tail) return null;
	return {
		body,
		bodyW: 30,
		bodyH: 16,
		wing,
		wingW: 18,
		wingH: 30,
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
