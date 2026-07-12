<script lang="ts">
	import type { PersonSummary } from '$lib/server/buildGraph';
	import { formatDisplayDate, yearOf } from '$lib/formatDate';

	let {
		person,
		width,
		height,
		root = false,
		canAdd = false,
		onAdd
	}: {
		person: PersonSummary;
		width: number;
		height: number;
		root?: boolean;
		canAdd?: boolean;
		onAdd?: (person: PersonSummary) => void;
	} = $props();

	function fullName(p: PersonSummary) {
		return [p.givenName, p.familyName].filter(Boolean).join(' ');
	}
	const years = $derived.by(() => {
		// When a lifespan is known (both dates), show just the years: "1992 – 2022".
		if (person.birthDate && person.deathDate) {
			return `${yearOf(person.birthDate)} – ${yearOf(person.deathDate)}`;
		}
		const born = formatDisplayDate(person.birthDate);
		const died = formatDisplayDate(person.deathDate);
		if (!born && !died) return '';
		if (died) return `? – ${died}`;
		return born;
	});
</script>

<div class="node-shell">
	<a
		class="node"
		class:female={person.sex === 'female'}
		class:unknown={!person.sex}
		class:root
		href={`/person/${person.id}`}
		style="width:{width}px;height:{height}px;"
		title={fullName(person)}
	>
		<div class="avatar">
			{#if person.primaryPhotoId}
				<img src={`/api/photos/${person.primaryPhotoId}`} alt="" />
			{:else}
				<span>{person.givenName[0] ?? '?'}</span>
			{/if}
		</div>
		<div class="name">{fullName(person)}</div>
		{#if years}<div class="years">{years}</div>{/if}
	</a>
	{#if canAdd}
		<button
			class="add-btn"
			type="button"
			aria-label={`Add a relative of ${fullName(person)}`}
			title="Add a relative"
			onclick={() => onAdd?.(person)}
		>+</button>
	{/if}
</div>

<style>
	.node-shell {
		position: relative;
		display: inline-block;
	}
	.add-btn {
		position: absolute;
		top: 4px;
		right: 4px;
		box-sizing: border-box;
		width: 22px;
		height: 22px;
		padding: 0;
		border-radius: 50%;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--primary);
		font-size: 15px;
		line-height: 1;
		display: grid;
		place-items: center;
		cursor: pointer;
		box-shadow: var(--shadow-sm);
		opacity: 0.5;
		transition:
			opacity 0.12s ease,
			background 0.12s ease,
			color 0.12s ease;
		z-index: 3;
	}
	.node-shell:hover .add-btn,
	.add-btn:focus-visible {
		opacity: 1;
	}
	.add-btn:hover {
		background: var(--primary);
		color: #fff;
		border-color: var(--primary);
	}
	.node {
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		padding: 0.6rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-top: 3px solid var(--male);
		border-radius: var(--radius);
		box-shadow: var(--shadow-sm);
		text-decoration: none;
		color: var(--text);
		transition: box-shadow 0.12s ease, transform 0.12s ease;
		overflow: hidden;
	}
	.node:hover {
		box-shadow: var(--shadow);
		transform: translateY(-2px);
		text-decoration: none;
	}
	.node.female {
		border-top-color: var(--female);
	}
	.node.unknown {
		border-top-color: var(--text-muted);
	}
	.node.root {
		box-shadow: 0 0 0 2px var(--primary);
	}
	.avatar {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		overflow: hidden;
		background: var(--male);
		color: #fff;
		display: grid;
		place-items: center;
		font-weight: 600;
		font-size: 1.2rem;
		flex-shrink: 0;
	}
	.node.female .avatar {
		background: var(--female);
	}
	.node.unknown .avatar {
		background: var(--text-muted);
	}
	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.name {
		font-weight: 600;
		font-size: 0.85rem;
		text-align: center;
		line-height: 1.2;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
	}
	.years {
		font-size: 0.72rem;
		color: var(--text-muted);
	}
</style>
