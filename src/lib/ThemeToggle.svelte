<script lang="ts">
	import { theme, type Theme } from '$lib/theme.svelte';

	const options: { value: Theme; label: string }[] = [
		{ value: 'light', label: 'Light' },
		{ value: 'system', label: 'System' },
		{ value: 'dark', label: 'Dark' }
	];
</script>

<div class="toggle" role="radiogroup" aria-label="Colour theme">
	{#each options as opt (opt.value)}
		<button
			type="button"
			role="radio"
			aria-checked={theme.current === opt.value}
			class:active={theme.current === opt.value}
			title={opt.label}
			aria-label={opt.label}
			onclick={() => theme.set(opt.value)}
		>
			{#if opt.value === 'light'}
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<circle cx="12" cy="12" r="4.2" />
					<path
						d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"
					/>
				</svg>
			{:else if opt.value === 'system'}
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<rect x="3" y="4" width="18" height="12" rx="1.5" />
					<path d="M8 20h8M12 16v4" />
				</svg>
			{:else}
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M20 13.2A8 8 0 1 1 10.8 4a6.3 6.3 0 0 0 9.2 9.2Z" />
				</svg>
			{/if}
		</button>
	{/each}
</div>

<style>
	.toggle {
		display: inline-flex;
		gap: 2px;
		padding: 3px;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 100px;
	}
	button {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 100px;
		color: var(--text-muted);
		cursor: pointer;
		transition: background 0.12s ease, color 0.12s ease;
	}
	button:hover {
		color: var(--text);
		background: transparent;
	}
	button.active {
		background: var(--surface);
		color: var(--primary);
		box-shadow: var(--shadow-sm);
	}
	svg {
		width: 16px;
		height: 16px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
</style>
