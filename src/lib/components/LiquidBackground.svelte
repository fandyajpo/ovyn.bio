<script lang="ts">
	import { onMount } from 'svelte';

	type Props = {
		/** Deep violet body of the liquid metal (dark) / blue body (light). */
		colorA?: string;
		/** Copper-gold highlight colour (dark) / orange highlight (light). */
		colorB?: string;
		/** The flat page colour behind the ribbon: black (dark) or bone (light). */
		baseColor?: string;
		/** Pink-lavender (dark) / warm peach (light) fresnel edge reflections. */
		rimColor?: string;
		/** Flow speed multiplier; the shader time advances at this rate. */
		speed?: number;
		/** Overall brightness multiplier for the rendered liquid. */
		intensity?: number;
	};

	let {
		colorA = '#2b0a4d',
		colorB = '#c98a4a',
		baseColor = '#000000',
		rimColor = '#f2b8d9',
		speed = 0.15,
		intensity = 1
	}: Props = $props();

	let host = $state<HTMLDivElement | undefined>(undefined);
	let canvas = $state<HTMLCanvasElement | undefined>(undefined);

	const colorAv = $derived(hexToLinear(colorA, [0.16, 0.04, 0.3]));
	const colorBv = $derived(hexToLinear(colorB, [0.8, 0.55, 0.3]));
	const baseAv = $derived(hexToLinear(baseColor, [0, 0, 0]));
	const rimAv = $derived(hexToLinear(rimColor, [0.95, 0.72, 0.85]));

	function hexToLinear(hex: string, fallback: [number, number, number]): [number, number, number] {
		const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
		if (!match?.[1]) return fallback;
		const int = parseInt(match[1], 16);
		return [((int >> 16) & 0xff) / 255, ((int >> 8) & 0xff) / 255, (int & 0xff) / 255];
	}

	// ---------------------------------------------------------------------------
	// Shaders. The body is shared between a WebGL2 (GLSL ES 3.00) and a WebGL1
	// (GLSL ES 1.00) variant; only the declarations differ via macros.
	// ---------------------------------------------------------------------------

	const FRAGMENT_BODY = `
	VARYING vec2 v_uv;

	uniform vec2 u_resolution;
	uniform float u_time;
	uniform vec3 u_colorA;
	uniform vec3 u_colorB;
	uniform vec3 u_base;
	uniform vec3 u_rim;
	uniform float u_speed;
	uniform float u_intensity;

	// Simplex noise 2D (Ashima Arts / Ian McEwan, MIT).
	vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
	vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
	vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

	float snoise(vec2 v) {
		const vec4 C = vec4(
			0.211324865405187, 0.366025403784439,
			-0.577350269189626, 0.024390243902439
		);

		// First corner
		vec2 i = floor(v + dot(v, C.xy));
		vec2 x0 = v - i + dot(i, C.xx);

		// Other corners
		vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
		vec4 x12 = x0.xyxy + C.xxzz;
		x12.xy -= i1;

		// Permutations
		i = mod289(i);
		vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));

		vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
		m = m * m;
		m = m * m;

		// Gradients: 41 points uniformly on a line.
		vec3 x = 2.0 * fract(p * C.www) - 1.0;
		vec3 h = abs(x) - 0.5;
		vec3 ox = floor(x + 0.5);
		vec3 a0 = x - ox;

		// Normalise gradients implicitly by scaling m.
		m *= inversesqrt(a0 * a0 + h * h);

		// Compute final noise value at P.
		vec3 g;
		g.x = a0.x * x0.x + h.x * x0.y;
		g.yz = a0.yz * x12.xz + h.yz * x12.zw;
		return 130.0 * dot(m, g);
	}

	// Three octaves of rotated simplex noise: enough detail for silky folds at a
	// cost the gradient lighting (three fbm evaluations) can afford.
	float fbm(vec2 p) {
		float value = 0.0;
		float amplitude = 0.55;
		mat2 rotation = mat2(0.8, 0.6, -0.6, 0.8);
		for (int i = 0; i < 3; i++) {
			value += amplitude * snoise(p);
			p = rotation * p * 2.0;
			amplitude *= 0.5;
		}
		return value;
	}

	void main() {
		vec2 uv = v_uv;
		float aspect = u_resolution.x / max(u_resolution.y, 1.0);
		vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
		float t = u_time * u_speed;

		// Two domain-warped fbm layers drive the ribbon's shape and folds.
		vec2 q = vec2(fbm(p * 1.3 + vec2(0.0, t * 0.6)), fbm(p * 1.3 + vec2(4.7, t * 0.5)));
		vec2 r = vec2(
			fbm(p + 2.2 * q + vec2(1.7, 9.2) + t * 0.3),
			fbm(p + 2.0 * q + vec2(8.3, 2.8) + t * 0.26)
		);
		vec2 warped = p + 1.5 * r;

		// The ribbon sweeps diagonally; a fold over the warped space gives it
		// smooth S-curves that never repeat.
		vec2 sweepDir = normalize(vec2(1.0, 0.6));
		float ribbonCoord = dot(warped, sweepDir);
		float fold = sin(warped.x * 1.6 + warped.y * 0.8 + r.x * 2.4 + t * 0.4);
		float ribbonCenter = fold * 0.3;
		float d = abs(ribbonCoord - ribbonCenter);
		float width = 0.3 + 0.16 * clamp(r.y * 0.5 + 0.5, 0.0, 1.0);
		float ribbonMask = 1.0 - smoothstep(width * 0.6, width, d);

		// r.x doubles as the surface height; its slope lights the metal.
		float e = 0.02;
		float hx = fbm(p + 2.2 * (q + vec2(e, 0.0)) + vec2(1.7, 9.2) + t * 0.3);
		float hy = fbm(p + 2.2 * (q + vec2(0.0, e)) + vec2(1.7, 9.2) + t * 0.3);
		vec2 slope = vec2(hx - r.x, hy - r.y) / e;
		vec3 normal = normalize(vec3(-slope * 0.4, 1.0));
		vec3 lightDir = normalize(vec3(0.4, 0.65, 0.65));
		float diffuse = clamp(dot(normal, lightDir), 0.0, 1.0);
		float specular = pow(
			clamp(dot(normal, normalize(lightDir + vec3(0.0, 0.0, 1.0))), 0.0, 1.0),
			24.0
		);

		// Fresnel-style rim glow just inside and outside the ribbon's edge.
		float rim = smoothstep(width * 0.55, width, d) * (1.0 - smoothstep(width, width * 1.5, d));

		vec3 body = u_colorA * (0.35 + 0.65 * diffuse);
		vec3 copper = u_colorB;

		// The page colour shows through wherever the ribbon isn't, with a
		// whisper of the surface variation so it never reads as flat paint.
		vec3 col = mix(u_base * (0.96 + 0.08 * clamp(r.x * 0.5 + 0.5, 0.0, 1.0)), body, ribbonMask);
		col += copper * specular * ribbonMask * 1.3;
		col += copper * pow(clamp(r.x * 0.5 + 0.5, 0.0, 1.0), 3.0) * ribbonMask * 0.4;
		col += u_rim * rim * (0.35 + 0.4 * ribbonMask);
		col += vec3(1.0, 0.97, 0.9) * specular * ribbonMask * 0.4;

		// A few droplets drift near the ribbon; cheap trig placement, no fbm.
		for (int i = 0; i < 5; i++) {
			float fi = float(i);
			vec2 seed = vec2(fi * 13.7 + 1.0, fi * 7.3 + 5.0);
			vec2 dropPos = vec2(
				sin(t * (0.05 + 0.017 * fi) + seed.x) * 0.55 * aspect,
				sin(t * (0.04 + 0.013 * fi) + seed.y) * 0.42 + (fi - 2.0) * 0.18
			);
			float radius = 0.012 + 0.009 * fract(fi * 7.13);
			float dist = length(p - dropPos);
			float drop = smoothstep(radius, radius * 0.35, dist);
			float dropSpec = smoothstep(radius * 0.6, 0.0, dist) * drop;
			col += u_colorB * 0.6 * drop;
			col += vec3(1.0, 0.95, 0.85) * dropSpec * 0.55;
		}

		// Gentle vignette keeps the corners quiet behind page content.
		col *= 1.0 - 0.3 * smoothstep(0.5, 1.1, length(p));
		col *= u_intensity;

		FRAG_OUT = vec4(col, 1.0);
	}
`;

const VERTEX_ES1 = `
	precision highp float;
	#define ATTR_IN attribute
	#define VARYING varying
	ATTR_IN vec2 a_position;
	VARYING vec2 v_uv;
	void main() {
		v_uv = a_position * 0.5 + 0.5;
		gl_Position = vec4(a_position, 0.0, 1.0);
	}
`;

const FRAGMENT_ES1 = `
	precision highp float;
	#define VARYING varying
	#define FRAG_OUT gl_FragColor
	${FRAGMENT_BODY}
`;

const VERTEX_ES3 = `
	#version 300 es
	#define ATTR_IN in
	#define VARYING out
	ATTR_IN vec2 a_position;
	VARYING vec2 v_uv;
	void main() {
		v_uv = a_position * 0.5 + 0.5;
		gl_Position = vec4(a_position, 0.0, 1.0);
	}
`;

const FRAGMENT_ES3 = `
	#version 300 es
	precision highp float;
	#define VARYING in
	#define FRAG_OUT fragColor
	out vec4 fragColor;
	${FRAGMENT_BODY}
`;

	type Cleanup = () => void;
	let teardown: Cleanup | null = null;
	// Set once the context is live; reactive so colour changes can repaint the
	// static reduced-motion frame.
	let ready = $state(false);
	let drawRef: ((now: number) => void) | null = null;
	let reducedMotionRef: MediaQueryList | null = null;

	onMount(() => {
		const el = canvas;
		if (!el) return;

		const gl2 = el.getContext('webgl2') as WebGL2RenderingContext | null;
		const gl = (gl2 ?? el.getContext('webgl')) as WebGLRenderingContext | null;
		// Without WebGL the CSS keeps the plain black background: fail quietly.
		if (!gl) return;

		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
		reducedMotionRef = reducedMotion;

		const isEs3 = gl2 !== null;
		const vertexSource = isEs3 ? VERTEX_ES3 : VERTEX_ES1;
		const fragmentSource = isEs3 ? FRAGMENT_ES3 : FRAGMENT_ES1;

		const compile = (type: number, source: string): WebGLShader | null => {
			const shader = gl.createShader(type);
			if (!shader) return null;
			gl.shaderSource(shader, source.trimStart());
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				console.error('LiquidBackground shader error:', gl.getShaderInfoLog(shader));
				gl.deleteShader(shader);
				return null;
			}
			return shader;
		};

		const vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
		const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
		if (!vertexShader || !fragmentShader) return;

		const program = gl.createProgram();
		if (!program) return;
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error('LiquidBackground link error:', gl.getProgramInfoLog(program));
			return;
		}
		gl.useProgram(program);

		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
		const positionLocation = gl.getAttribLocation(program, 'a_position');
		if (positionLocation >= 0) {
			gl.enableVertexAttribArray(positionLocation);
			gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
		}

		const uResolution = gl.getUniformLocation(program, 'u_resolution');
		const uTime = gl.getUniformLocation(program, 'u_time');
		const uColorA = gl.getUniformLocation(program, 'u_colorA');
		const uColorB = gl.getUniformLocation(program, 'u_colorB');
		const uBase = gl.getUniformLocation(program, 'u_base');
		const uRim = gl.getUniformLocation(program, 'u_rim');
		const uSpeed = gl.getUniformLocation(program, 'u_speed');
		const uIntensity = gl.getUniformLocation(program, 'u_intensity');

		// Rendering state lives outside reactivity: the rAF loop reads plain
		// locals and never triggers Svelte updates.
		let raf = 0;
		let running = false;
		let last = 0;
		// Start mid-flow so the first painted frame is already liquid.
		let time = 12.3;

		const draw = (now: number) => {
			time += Math.min((now - last) / 1000, 0.05);
			last = now;
			gl.uniform1f(uTime, time);
			gl.uniform3f(uColorA, colorAv[0], colorAv[1], colorAv[2]);
			gl.uniform3f(uColorB, colorBv[0], colorBv[1], colorBv[2]);
			gl.uniform3f(uBase, baseAv[0], baseAv[1], baseAv[2]);
			gl.uniform3f(uRim, rimAv[0], rimAv[1], rimAv[2]);
			gl.uniform1f(uSpeed, speed);
			gl.uniform1f(uIntensity, intensity);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		};

		const resize = () => {
			// DPR capped at 1.5: the shader is fill-rate heavy, and the soft
			// highlights hide the resolution difference.
			const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
			const width = Math.max(1, Math.round(window.innerWidth * dpr));
			const height = Math.max(1, Math.round(window.innerHeight * dpr));
			if (el.width === width && el.height === height) return;
			el.width = width;
			el.height = height;
			gl.viewport(0, 0, width, height);
			gl.uniform2f(uResolution, width, height);
			if (reducedMotion.matches) draw(performance.now());
		};

		const stop = () => {
			running = false;
			if (raf) cancelAnimationFrame(raf);
			raf = 0;
		};

		const start = () => {
			if (running || reducedMotion.matches || document.hidden) return;
			running = true;
			last = performance.now();
			raf = requestAnimationFrame(frame);
		};

		const frame = (now: number) => {
			raf = requestAnimationFrame(frame);
			if (document.hidden) return;
			draw(now);
		};

		const onVisibility = () => {
			if (document.hidden) stop();
			else start();
		};

		const onMotionPreference = () => {
			if (reducedMotion.matches) {
				stop();
				draw(performance.now());
			} else {
				start();
			}
		};

		resize();
		window.addEventListener('resize', resize);
		document.addEventListener('visibilitychange', onVisibility);
		reducedMotion.addEventListener?.('change', onMotionPreference);

		if (reducedMotion.matches) draw(performance.now());
		else start();

		drawRef = draw;
		ready = true;

		teardown = () => {
			stop();
			window.removeEventListener('resize', resize);
			document.removeEventListener('visibilitychange', onVisibility);
			reducedMotion.removeEventListener?.('change', onMotionPreference);

			if (positionLocation >= 0) gl.disableVertexAttribArray(positionLocation);
			gl.bindBuffer(gl.ARRAY_BUFFER, null);
			if (buffer) gl.deleteBuffer(buffer);
			gl.deleteShader(vertexShader);
			gl.deleteShader(fragmentShader);
			gl.deleteProgram(program);

			drawRef = null;
			reducedMotionRef = null;
			ready = false;

			// Hand the context back explicitly so browsers reclaim it promptly.
			gl.getExtension('WEBGL_lose_context')?.loseContext();
		};
	});

	// Under reduced motion the frame is static, so colour or intensity changes
	// must repaint it; while animating the loop picks the values up anyway.
	$effect(() => {
		if (!ready || reducedMotionRef?.matches !== true) return;
		// Read the props here so the effect re-runs (and repaints) when they change.
		void colorAv;
		void colorBv;
		void baseAv;
		void rimAv;
		void intensity;
		drawRef?.(performance.now());
	});

	$effect(() => () => teardown?.());
</script>

<div class="liquid-host" aria-hidden="true">
	<canvas bind:this={canvas} class="liquid-canvas"></canvas>
</div>

<style>
	.liquid-host {
		position: fixed;
		inset: 0;
		z-index: -1;
		width: 100vw;
		height: 100vh;
		pointer-events: none;
		/* Flat colour behind the canvas: correct from the first paint, since it
		   follows the html attribute set before hydration, not a reactive prop. */
		background: #000;
	}

	:global(html[data-theme='light']) .liquid-host {
		background: #ebe7dc;
	}

	.liquid-canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>