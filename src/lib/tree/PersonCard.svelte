<script lang="ts">
	import type { PersonSummary } from '$lib/server/buildGraph';

	let {
		person,
		width,
		height,
		root = false
	}: { person: PersonSummary; width: number; height: number; root?: boolean } = $props();

	function fullName(p: PersonSummary) {
		return [p.givenName, p.familyName].filter(Boolean).join(' ');
	}
	const years = $derived(
		[person.birthDate, person.deathDate].some(Boolean)
			? `${person.birthDate ?? '?'}${person.deathDate ? `–${person.deathDate}` : ''}`
			: ''
	);
</script>

<a
	class="node"
	class:female={person.sex === 'female'}
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

<style>
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
