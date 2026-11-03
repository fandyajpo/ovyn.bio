<script lang="ts">
	import { browser } from '$app/env';
	import Button from './ui/Button.svelte';
	import Modal from './ui/Modal.svelte';
	import { toast } from './ui/toasts.svelte.ts';

	type Props = {
		open?: boolean;
		url: string;
		name: string;
		handle: string;
		bio?: string | null;
	};

	let { open = $bindable(false), url, name, handle, bio = null }: Props = $props();

	let copied = $state(false);
	let sharing = $state(false);
	let canvas = $state<HTMLCanvasElement | undefined>(undefined);
	let cardUrl = $state<string | null>(null);

	const canShare = $derived(browser && typeof navigator.share === 'function');

	// The card is drawn once the dialog is open, when the hidden canvas exists.
	$effect(() => {
		if (!open) {
			cardUrl = null;
			return;
		}
		const element = canvas;
		if (!element) return;
		cardUrl = renderCard(element);
	});

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(url);
			copied = true;
			toast('success', 'Link copied');
			setTimeout(() => (copied = false), 1800);
		} catch {
			toast('error', 'Copy is unavailable in this browser');
		}
	}

	async function shareNatively() {
		sharing = true;
		try {
			await navigator.share({ title: `${name} on ovyn`, text: `Take a look at ${name} on ovyn`, url });
		} catch {
			// Dismissing the share sheet is not an error.
		} finally {
			sharing = false;
		}
	}

	function downloadCard() {
		const data = cardUrl ?? (canvas ? renderCard(canvas) : null);
		if (!data) return;
		const link = document.createElement('a');
		link.href = data;
		link.download = `ovyn-${handle}.png`;
		link.click();
		toast('success', 'Share card downloaded');
	}

	function renderCard(element: HTMLCanvasElement): string | null {
		const context = element.getContext('2d');
		if (!context) return null;

		const width = 1080;
		const height = 1350;
		element.width = width;
		element.height = height;

		context.fillStyle = '#111210';
		context.fillRect(0, 0, width, height);

		const glow = context.createRadialGradient(width * 0.82, 180, 40, width * 0.82, 180, width * 0.9);
		glow.addColorStop(0, 'rgba(213, 255, 53, 0.4)');
		glow.addColorStop(1, 'rgba(213, 255, 53, 0)');
		context.fillStyle = glow;
		context.fillRect(0, 0, width, height);

		context.fillStyle = '#d5ff35';
		context.font = '600 42px Poppins, system-ui, sans-serif';
		context.fillText('ovyn.me', 80, 130);

		context.fillStyle = '#faf7f4';
		context.font = '700 96px Poppins, system-ui, sans-serif';
		wrapText(context, name, 80, 600, width - 160, 110);

		context.fillStyle = '#d5ff35';
		context.font = '500 48px Poppins, system-ui, sans-serif';
		context.fillText(`@${handle}`, 80, 760);

		if (bio) {
			context.fillStyle = 'rgba(250, 247, 244, 0.72)';
			context.font = '400 38px Poppins, system-ui, sans-serif';
			wrapText(context, bio, 80, 850, width - 160, 54);
		}

		context.fillStyle = 'rgba(250, 247, 244, 0.45)';
		context.font = '400 32px Poppins, system-ui, sans-serif';
		context.fillText('your identity. your circle.', 80, height - 90);

		return element.toDataURL('image/png');
	}

	function wrapText(
		context: CanvasRenderingContext2D,
		text: string,
		x: number,
		y: number,
		maxWidth: number,
		lineHeight: number
	) {
		const words = text.split(/\s+/).filter(Boolean);
		if (words.length === 0) return;

		let line = '';
		let cursor = y;
		for (const word of words) {
			const candidate = line ? `${line} ${word}` : word;
			if (context.measureText(candidate).width > maxWidth && line) {
				context.fillText(line, x, cursor);
				line = word;
				cursor += lineHeight;
			} else {
				line = candidate;
			}
		}
		if (line) context.fillText(line, x, cursor);
	}
</script>

<Modal bind:open title="Share your page" description={`Send ovyn.me/${handle} to the people who should see it.`}>
	<div class="flex flex-col gap-4">
		<div class="share-preview">
			<p class="share-preview-handle">ovyn.me/{handle}</p>
			<p class="share-preview-name">{name}</p>
			{#if bio}<p class="share-preview-bio">{bio}</p>{/if}
		</div>

		<div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
			<Button onclick={copyLink}>{copied ? 'Copied' : 'Copy link'}</Button>
			{#if canShare}
				<Button variant="secondary" onclick={shareNatively} loading={sharing}>Share…</Button>
			{/if}
			<Button href={`/${handle}`} variant="ghost">View page</Button>
			<Button variant="ghost" onclick={downloadCard}>Download card</Button>
		</div>

		<p class="text-xs text-neutral-500">The card is a 1080 x 1350 image with your name and link, ready for a story or a post.</p>
	</div>
	<canvas bind:this={canvas} class="hidden" aria-hidden="true"></canvas>
</Modal>

<style>
	.share-preview {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		border: 1px solid var(--color-divider);
		border-radius: 1.1rem;
		background:
			radial-gradient(ellipse at 82% 0%, color-mix(in srgb, var(--color-accent) 24%, transparent), transparent 60%),
			color-mix(in srgb, var(--color-surface) 92%, transparent);
		padding: 1.1rem 1.15rem;
	}

	.share-preview-handle {
		color: var(--color-accent);
		font-family: var(--font-mono);
		font-size: 0.66rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.share-preview-name {
		font-family: var(--font-display);
		font-size: 1.4rem;
		font-weight: 700;
		letter-spacing: -0.03em;
	}

	.share-preview-bio {
		color: var(--color-muted);
		font-size: 0.8rem;
		line-height: 1.55;
	}
</style>
