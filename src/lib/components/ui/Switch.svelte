<script lang="ts">
	import { cn } from '#lib/utils';

	let {
		name,
		label,
		checked = $bindable(false),
		disabled = false,
		value = 'on',
		description = null,
		class: className
	}: {
		name: string;
		label: string;
		checked?: boolean;
		disabled?: boolean;
		value?: string;
		description?: string | null;
		class?: string;
	} = $props();

	const id = $props.id();
</script>

<div class={cn('switch-field', className)}>
	<label for={id} class="switch-label">
		<span class="switch-copy">
			<span class="switch-title">{label}</span>
			{#if description}<span class="switch-description">{description}</span>{/if}
		</span>
		<span class="switch-control">
			<input {id} {name} type="checkbox" role="switch" {value} bind:checked {disabled} />
			<span class="switch-track" aria-hidden="true"><span class="switch-thumb"></span></span>
		</span>
	</label>
</div>

<style>
	.switch-label {
		display: flex;
		min-height: 3.25rem;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		cursor: pointer;
	}

	.switch-copy { display: grid; gap: 0.2rem; }
	.switch-title { color: var(--color-foreground); font-size: 0.88rem; font-weight: 500; }
	.switch-description { color: var(--color-muted); font-size: 0.75rem; line-height: 1.5; }
	.switch-control { position: relative; display: inline-flex; flex: 0 0 auto; }

	.switch-control input {
		position: absolute;
		width: 1px;
		height: 1px;
		top: 50%;
		left: 50%;
		opacity: 0;
	}

	.switch-track {
		display: flex;
		width: 3rem;
		height: 1.65rem;
		align-items: center;
		border: 1px solid color-mix(in srgb, var(--color-foreground) 16%, transparent);
		border-radius: 999px;
		background: linear-gradient(160deg, color-mix(in srgb, var(--color-surface-raised) 94%, transparent), color-mix(in srgb, var(--color-background) 80%, transparent));
		padding: 0.15rem;
		box-shadow: inset 0 1px 2px rgb(0 0 0 / 12%);
		transition: background 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
	}

	.switch-thumb {
		width: 1.2rem;
		height: 1.2rem;
		border-radius: 50%;
		background: linear-gradient(150deg, color-mix(in srgb, var(--color-foreground) 92%, transparent), color-mix(in srgb, var(--color-muted) 80%, transparent));
		box-shadow: 0 2px 6px rgb(0 0 0 / 24%);
		transition: transform 240ms cubic-bezier(0.2, 0.9, 0.3, 1.15), background 220ms ease;
	}

	.switch-control input:checked + .switch-track {
		border-color: color-mix(in srgb, var(--color-accent) 70%, transparent);
		background: linear-gradient(120deg, var(--color-accent), color-mix(in srgb, var(--color-pop-lilac) 72%, var(--color-accent)));
		box-shadow: 0 6px 20px color-mix(in srgb, var(--color-accent) 28%, transparent);
	}

	.switch-control input:checked + .switch-track .switch-thumb {
		background: var(--color-on-accent);
		transform: translateX(1.33rem);
	}

	.switch-control input:focus-visible + .switch-track {
		outline: 2px solid var(--color-accent);
		outline-offset: 3px;
	}

	.switch-control input:disabled + .switch-track { opacity: 0.45; }
	.switch-label:has(input:disabled) { cursor: not-allowed; }

	@media (prefers-reduced-motion: reduce) {
		.switch-track,
		.switch-thumb { transition: none; }
	}
</style>
