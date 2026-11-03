<script lang="ts">
	import Button from './ui/Button.svelte';
	import Modal from './ui/Modal.svelte';

	type Props = {
		open?: boolean;
		file?: File | null;
		aspect?: number;
		title?: string;
		onconfirm?: (file: File) => void;
	};

	let { open = $bindable(false), file = null, aspect = 1, title = 'Crop your image', onconfirm }: Props =
		$props();

	let imageUrl = $state<string | null>(null);
	let imageEl = $state<HTMLImageElement | null>(null);
	let stageWidth = $state(0);
	let imageWidth = $state(0);
	let imageHeight = $state(0);
	let zoom = $state(1);
	let offsetX = $state(0);
	let offsetY = $state(0);
	let dragging = $state(false);
	let saving = $state(false);
	let dragStart = { x: 0, y: 0, offsetX: 0, offsetY: 0 };

	const display = $derived.by(() => {
		if (!stageWidth || !imageWidth || !imageHeight) return { width: 0, height: 0, base: 1 };
		const stageHeight = stageWidth / aspect;
		const cover = Math.max(stageWidth / imageWidth, stageHeight / imageHeight);
		const base = cover * zoom;
		return { width: imageWidth * base, height: imageHeight * base, base };
	});

	const maxX = $derived(Math.max(0, (display.width - stageWidth) / 2));
	const maxY = $derived(Math.max(0, (display.height - stageWidth / aspect) / 2));

	// The rendered offsets always stay inside the image, even after a zoom out.
	const x = $derived(clamp(offsetX, -maxX, maxX));
	const y = $derived(clamp(offsetY, -maxY, maxY));

	function clamp(value: number, min: number, max: number) {
		return Math.min(Math.max(value, min), max);
	}

	// A fresh object URL for each picked file, revoked when the dialog closes.
	$effect(() => {
		const current = file;
		if (!open || !current) {
			imageUrl = null;
			return;
		}
		const url = URL.createObjectURL(current);
		imageUrl = url;
		imageWidth = 0;
		imageHeight = 0;
		zoom = 1;
		offsetX = 0;
		offsetY = 0;
		return () => URL.revokeObjectURL(url);
	});

	$effect(() => {
		if (offsetX !== x) offsetX = x;
		if (offsetY !== y) offsetY = y;
	});

	function onImageLoaded() {
		const element = imageEl;
		if (!element) return;
		imageWidth = element.naturalWidth;
		imageHeight = element.naturalHeight;
		zoom = 1;
		offsetX = 0;
		offsetY = 0;
	}

	function zoomBy(delta: number) {
		zoom = clamp(Math.round((zoom + delta) * 100) / 100, 1, 3);
	}

	function reset() {
		zoom = 1;
		offsetX = 0;
		offsetY = 0;
	}

	function onPointerDown(event: PointerEvent) {
		if (event.button !== 0) return;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		dragging = true;
		dragStart = { x: event.clientX, y: event.clientY, offsetX, offsetY };
	}

	function onPointerMove(event: PointerEvent) {
		if (!dragging) return;
		offsetX = dragStart.offsetX + (event.clientX - dragStart.x);
		offsetY = dragStart.offsetY + (event.clientY - dragStart.y);
	}

	function onPointerUp(event: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		const element = event.currentTarget as HTMLElement;
		if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
	}

	function onKeydown(event: KeyboardEvent) {
		const step = event.shiftKey ? 24 : 8;
		if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
			event.preventDefault();
			if (event.key === 'ArrowLeft') offsetX -= step;
			if (event.key === 'ArrowRight') offsetX += step;
			if (event.key === 'ArrowUp') offsetY -= step;
			if (event.key === 'ArrowDown') offsetY += step;
			return;
		}
		if (event.key === '+' || event.key === '=') {
			event.preventDefault();
			zoomBy(0.1);
		}
		if (event.key === '-') {
			event.preventDefault();
			zoomBy(-0.1);
		}
	}

	async function confirmCrop() {
		const element = imageEl;
		const current = file;
		if (!element || !current || !imageWidth || !imageHeight || !display.base) return;

		saving = true;
		try {
			const stageHeight = stageWidth / aspect;
			const imageLeft = (stageWidth - display.width) / 2 + x;
			const imageTop = (stageHeight - display.height) / 2 + y;

			const sourceWidth = Math.min(imageWidth, stageWidth / display.base);
			const sourceHeight = Math.min(imageHeight, stageHeight / display.base);
			const sourceX = clamp(-imageLeft / display.base, 0, Math.max(0, imageWidth - sourceWidth));
			const sourceY = clamp(-imageTop / display.base, 0, Math.max(0, imageHeight - sourceHeight));

			const outputWidth = aspect >= 2 ? 1920 : 512;
			const outputHeight = Math.max(1, Math.round(outputWidth / aspect));

			const canvas = document.createElement('canvas');
			canvas.width = outputWidth;
			canvas.height = outputHeight;
			const context = canvas.getContext('2d');
			if (!context) return;
			context.imageSmoothingQuality = 'high';
			context.drawImage(element, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputWidth, outputHeight);

			const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.92));
			if (!blob) return;

			const base = current.name.replace(/\.[^.]+$/, '') || 'image';
			onconfirm?.(new File([blob], `${base}-crop.webp`, { type: 'image/webp', lastModified: Date.now() }));
			open = false;
		} finally {
			saving = false;
		}
	}
</script>

<Modal bind:open {title} description="Drag the photo to position it, then zoom in or out. Arrow keys nudge, plus and minus zoom.">
	<div class="flex flex-col gap-4">
		<!-- svelte-ignore a11y_no_noninteractive_tabindex a11y_no_noninteractive_element_interactions -->
		<div
			class="crop-stage"
			class:is-dragging={dragging}
			class:is-round={aspect === 1}
			style={`aspect-ratio: ${aspect}`}
			bind:clientWidth={stageWidth}
			role="application"
			tabindex="0"
			aria-label="Crop area. Drag to move the image, arrow keys to nudge, plus and minus to zoom."
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerup={onPointerUp}
			onpointercancel={onPointerUp}
			onkeydown={onKeydown}
		>
			{#if imageUrl}
				<img
					bind:this={imageEl}
					src={imageUrl}
					alt=""
					draggable="false"
					class="crop-image"
					style={`width: ${display.width}px; height: ${display.height}px; left: ${stageWidth / 2 + x}px; top: ${stageWidth / aspect / 2 + y}px`}
					onload={onImageLoaded}
				/>
			{/if}
			<div class="crop-grid" aria-hidden="true"></div>
			{#if aspect === 1}<div class="crop-circle" aria-hidden="true"></div>{/if}
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<button type="button" class="crop-zoom-button" onclick={() => zoomBy(-0.1)} disabled={zoom <= 1} aria-label="Zoom out">−</button>
			<span class="crop-zoom-value">{Math.round(zoom * 100)}%</span>
			<button type="button" class="crop-zoom-button" onclick={() => zoomBy(0.1)} disabled={zoom >= 3} aria-label="Zoom in">+</button>
			<button type="button" class="crop-reset" onclick={reset}>Reset</button>
		</div>

		<div class="flex flex-wrap gap-2">
			<Button type="button" onclick={confirmCrop} loading={saving}>Use this crop</Button>
			<Button type="button" variant="secondary" onclick={() => (open = false)}>Cancel</Button>
		</div>
	</div>
</Modal>

<style>
	.crop-stage {
		position: relative;
		width: 100%;
		overflow: hidden;
		border: 1px solid var(--color-divider);
		border-radius: 1.1rem;
		background:
			repeating-conic-gradient(rgb(255 255 255 / 4%) 0% 25%, transparent 0% 50%) 0 0 / 22px 22px,
			#0d0c0a;
		cursor: grab;
		touch-action: none;
	}

	.crop-stage.is-dragging { cursor: grabbing; }
	.crop-stage:focus-visible { outline: 2px solid color-mix(in srgb, var(--color-accent) 60%, transparent); outline-offset: 2px; }

	.crop-image {
		position: absolute;
		max-width: none;
		transform: translate(-50%, -50%);
		user-select: none;
		pointer-events: none;
	}

	.crop-grid {
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(to right, rgb(255 255 255 / 20%) 1px, transparent 1px),
			linear-gradient(to bottom, rgb(255 255 255 / 20%) 1px, transparent 1px);
		background-size: 33.333% 33.333%;
		background-position: -1px -1px;
		pointer-events: none;
	}

	.crop-circle {
		position: absolute;
		inset: 6%;
		border: 2px solid rgb(255 255 255 / 55%);
		border-radius: 50%;
		pointer-events: none;
	}

	.crop-zoom-button {
		display: grid;
		width: 2.4rem;
		height: 2.4rem;
		place-items: center;
		border: 1px solid var(--color-divider);
		border-radius: 0.7rem;
		background: color-mix(in srgb, var(--color-surface) 80%, transparent);
		color: var(--color-foreground);
		font-size: 1.15rem;
		line-height: 1;
		transition: border-color 160ms ease, background-color 160ms ease;
	}

	.crop-zoom-button:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
		background: var(--color-accent-soft);
	}

	.crop-zoom-button:disabled { color: var(--color-muted); cursor: not-allowed; }

	.crop-zoom-value {
		min-width: 3rem;
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.7rem;
		text-align: center;
	}

	.crop-reset {
		margin-left: auto;
		border: 1px solid var(--color-divider);
		border-radius: 999px;
		padding: 0.4rem 0.8rem;
		background: transparent;
		color: var(--color-muted);
		font: inherit;
		font-size: 0.72rem;
	}

	.crop-reset:hover { color: var(--color-foreground); }

	@media (prefers-reduced-motion: reduce) {
		.crop-zoom-button { transition: none; }
	}
</style>
