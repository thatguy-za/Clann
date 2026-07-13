<script lang="ts">
	import calcTree from 'relatives-tree';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { TreeData, PersonSummary } from '$lib/server/buildGraph';
	import PersonCard from './PersonCard.svelte';
	import AddRelativeModal from './AddRelativeModal.svelte';

	let { tree, isAdmin = false }: { tree: TreeData; isAdmin?: boolean } = $props();

	// First-run form state (shown when the tree is empty).
	let firstError = $state('');
	let addingFirst = $state(false);
	const submitFirst = () => {
		addingFirst = true;
		return async ({ result }: { result: { type: string; data?: Record<string, unknown> } }) => {
			addingFirst = false;
			if (result.type === 'success') await invalidateAll();
			else if (result.type === 'failure') firstError = (result.data?.error as string) ?? 'Could not add.';
		};
	};

	// Which person we're adding a relative to (null = modal closed).
	let addAnchor = $state<PersonSummary | null>(null);
	const anchorHasParents = $derived(
		addAnchor ? (tree.nodes.find((n) => n.id === addAnchor!.id)?.parents.length ?? 0) > 0 : false
	);

	const NODE_W = 150;
	const NODE_H = 140;
	const GAP = 26;
	const unitX = NODE_W / 2;
	const unitY = NODE_H / 2;

	let rootId = $state('');

	// Falls back to the default ancestor until the user picks a root.
	const effectiveRoot = $derived(
		tree.index[rootId] ? rootId : (tree.defaultRootId ?? tree.nodes[0]?.id ?? '')
	);

	const layout = $derived.by(() => {
		if (!effectiveRoot || tree.nodes.length === 0) return null;
		try {
			// relatives-tree types use const enums; our string values match at runtime.
			return calcTree(tree.nodes as never, { rootId: effectiveRoot });
		} catch (e) {
			console.error('calcTree failed', e);
			return null;
		}
	});

	// --- Pan & zoom ---
	let zoom = $state(1);
	let panX = $state(40);
	let panY = $state(40);
	let dragging = $state(false);
	let startX = 0;
	let startY = 0;

	function onPointerDown(e: PointerEvent) {
		// Only pan when the drag starts on the background, not on a card or its
		// "+" add button.
		const target = e.target as HTMLElement;
		if (target.closest('.node') || target.closest('.add-btn')) return;
		dragging = true;
		startX = e.clientX - panX;
		startY = e.clientY - panY;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}
	function onPointerMove(e: PointerEvent) {
		if (!dragging) return;
		panX = e.clientX - startX;
		panY = e.clientY - startY;
	}
	function onPointerUp() {
		dragging = false;
	}
	function zoomBy(delta: number) {
		zoom = Math.min(2, Math.max(0.3, +(zoom + delta).toFixed(2)));
	}
	function reset() {
		zoom = 1;
		panX = 40;
		panY = 40;
	}
	function onWheel(e: WheelEvent) {
		if (!e.ctrlKey && !e.metaKey) return; // only zoom with modifier, else let page scroll
		e.preventDefault();
		zoomBy(e.deltaY < 0 ? 0.1 : -0.1);
	}

	const sortedPeople = $derived(
		Object.values(tree.index).sort((a, b) =>
			[a.givenName, a.familyName].join(' ').localeCompare([b.givenName, b.familyName].join(' '))
		)
	);
</script>

{#if tree.nodes.length === 0}
	<div class="empty">
		<div class="empty-card card">
			<div class="empty-mark">⛬</div>
			<h2>Start your family tree</h2>
			{#if isAdmin}
				<p class="muted">Add the first person — you can build out their relatives from there.</p>
				<form method="POST" action="?/addFirstPerson" class="first-form" use:enhance={submitFirst}>
					{#if firstError}<div class="error">{firstError}</div>{/if}
					<div class="field">
						<label for="first-given">Given name</label>
						<input id="first-given" name="givenName" required />
					</div>
					<div class="field">
						<label for="first-family">Family name</label>
						<input id="first-family" name="familyName" />
					</div>
					<div class="row">
						<div class="field" style="flex:1;">
							<label for="first-sex">Sex</label>
							<select id="first-sex" name="sex">
								<option value="">Unknown</option>
								<option value="male">Male</option>
								<option value="female">Female</option>
							</select>
						</div>
						<div class="field" style="flex:1;">
							<label for="first-born">Born</label>
							<input id="first-born" name="birthDate" placeholder="Date (YYYY/MM/DD)" />
						</div>
					</div>
					<button type="submit" disabled={addingFirst} style="width:100%;justify-content:center;">
						{addingFirst ? 'Adding…' : 'Add first person'}
					</button>
				</form>
			{:else}
				<p class="muted">There's no one here yet. Ask an admin to add the first person.</p>
			{/if}
		</div>
	</div>
{:else}
	<div class="toolbar">
		<label class="root-picker">
			<span class="muted">Root</span>
			<select value={effectiveRoot} onchange={(e) => (rootId = e.currentTarget.value)}>
				{#each sortedPeople as p (p.id)}
					<option value={p.id}>{[p.givenName, p.familyName].filter(Boolean).join(' ')}</option>
				{/each}
			</select>
		</label>
		<div class="zoom">
			<button class="btn-secondary" onclick={() => zoomBy(-0.1)} aria-label="Zoom out">−</button>
			<span class="zoom-val">{Math.round(zoom * 100)}%</span>
			<button class="btn-secondary" onclick={() => zoomBy(0.1)} aria-label="Zoom in">+</button>
			<button class="btn-secondary" onclick={reset}>Reset</button>
		</div>
	</div>

	<div
		class="viewport"
		class:dragging
		role="application"
		aria-label="Family tree canvas — drag to pan"
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onpointercancel={onPointerUp}
		onwheel={onWheel}
	>
		{#if layout}
			<div
				class="canvas"
				style="transform: translate({panX}px, {panY}px) scale({zoom});
				       width:{layout.canvas.width * unitX}px; height:{layout.canvas.height * unitY}px;"
			>
				<svg
					class="connectors"
					width={layout.canvas.width * unitX}
					height={layout.canvas.height * unitY}
				>
					{#each layout.connectors as c, i (i)}
						<line
							x1={c[0] * unitX}
							y1={c[1] * unitY}
							x2={c[2] * unitX}
							y2={c[3] * unitY}
						/>
					{/each}
				</svg>

				{#each layout.nodes as n (n.id)}
					{#if tree.index[n.id]}
						<div
							class="node-wrap"
							style="left:{n.left * unitX + GAP / 2}px; top:{n.top * unitY + GAP / 2}px;"
						>
							<PersonCard
								person={tree.index[n.id]}
								width={NODE_W - GAP}
								height={NODE_H - GAP}
								root={n.id === effectiveRoot}
								canAdd={isAdmin}
								onAdd={(p) => (addAnchor = p)}
							/>
						</div>
					{/if}
				{/each}
			</div>
		{:else}
			<p class="muted" style="padding:2rem;">Unable to lay out the tree.</p>
		{/if}
	</div>
{/if}

{#if addAnchor}
	<AddRelativeModal
		anchor={addAnchor}
		hasParents={anchorHasParents}
		onClose={() => (addAnchor = null)}
	/>
{/if}

<style>
	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 1.25rem;
		border-bottom: 1px solid var(--border);
		background: var(--surface);
		flex-wrap: wrap;
	}
	.root-picker {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
	}
	.root-picker span {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.root-picker select {
		width: auto;
		min-width: 180px;
	}
	.zoom {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.zoom .btn-secondary {
		padding: 0.35rem 0.7rem;
	}
	.zoom-val {
		font-size: 0.85rem;
		color: var(--text-muted);
		min-width: 3rem;
		text-align: center;
	}
	.viewport {
		position: relative;
		width: 100%;
		height: calc(100vh - 60px - 54px);
		overflow: hidden;
		background:
			radial-gradient(circle, var(--border) 1px, transparent 1px) 0 0 / 24px 24px;
		cursor: grab;
		touch-action: none;
	}
	.viewport.dragging {
		cursor: grabbing;
	}
	.canvas {
		position: absolute;
		transform-origin: 0 0;
	}
	.connectors {
		position: absolute;
		top: 0;
		left: 0;
		pointer-events: none;
		overflow: visible;
	}
	.connectors line {
		stroke: var(--text-muted);
		stroke-width: 1.5;
		opacity: 0.5;
	}
	.node-wrap {
		position: absolute;
	}
	.empty {
		display: grid;
		place-items: center;
		height: calc(100vh - 60px);
		padding: 2rem;
	}
	.empty-card {
		text-align: center;
		padding: 2.5rem;
		max-width: 380px;
	}
	.empty-mark {
		font-size: 2.5rem;
		color: var(--primary);
	}
	.empty-card h2 {
		margin: 0.5rem 0;
	}
	.first-form {
		text-align: left;
		margin-top: 1.5rem;
	}
	.first-form .row {
		display: flex;
		gap: 0.75rem;
	}
	.first-form button {
		margin-top: 0.5rem;
	}
</style>
