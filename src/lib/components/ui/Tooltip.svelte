<script lang="ts">
	let {
		content,
		label = 'More information',
		placement = 'top'
	}: {
		content: string;
		label?: string;
		placement?: 'top' | 'bottom' | 'left' | 'right';
	} = $props();

	const id = $props.id();
</script>

<span class="tooltip-root" data-placement={placement}>
	<button type="button" class="tooltip-trigger" aria-label={label} aria-describedby={id}>
		<span aria-hidden="true">?</span>
	</button>
	<span id={id} class="tooltip-bubble" role="tooltip">{content}</span>
</span>

<style>
	.tooltip-root {
		position: relative;
		display: inline-flex;
		vertical-align: middle;
	}

	.tooltip-trigger {
		display: grid;
		width: 1.5rem;
		height: 1.5rem;
		place-items: center;
		border: 1px solid var(--color-divider);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-pop-blue) 12%, var(--color-surface));
		color: var(--color-pop-blue);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.7rem;
		font-weight: 700;
	}

	.tooltip-bubble {
		position: absolute;
		z-index: 60;
		width: max-content;
		max-width: min(17rem, 80vw);
		border: 1px solid var(--color-divider);
		border-radius: 0.75rem;
		background: var(--color-menu-glass);
		padding: 0.65rem 0.8rem;
		color: var(--color-foreground);
		font-family: var(--font-sans);
		font-size: 0.75rem;
		font-weight: 400;
		line-height: 1.45;
		box-shadow: 0 10px 28px rgb(0 0 0 / 30%);
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		transition: opacity 120ms ease, transform 120ms ease, visibility 0s linear 120ms;
	}

	[data-placement='top'] .tooltip-bubble {
		bottom: calc(100% + 0.5rem);
		left: 50%;
		transform: translate(-50%, 0.25rem);
	}

	[data-placement='bottom'] .tooltip-bubble {
		top: calc(100% + 0.5rem);
		left: 50%;
		transform: translate(-50%, -0.25rem);
	}

	[data-placement='left'] .tooltip-bubble {
		top: 50%;
		right: calc(100% + 0.5rem);
		transform: translate(0.25rem, -50%);
	}

	[data-placement='right'] .tooltip-bubble {
		top: 50%;
		left: calc(100% + 0.5rem);
		transform: translate(-0.25rem, -50%);
	}

	.tooltip-root:hover .tooltip-bubble,
	.tooltip-root:focus-within .tooltip-bubble {
		opacity: 1;
		visibility: visible;
		transform: translate(0, 0);
		transition-delay: 0s;
	}

	@media (prefers-reduced-motion: reduce) {
		.tooltip-bubble { transition: none; }
	}
</style>
