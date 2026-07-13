<script lang="ts">
	let { data } = $props();
</script>

<svelte:head><title>Export family tree · Clann</title></svelte:head>

<div class="wrap">
	<a class="back" href="/">← Back to tree</a>
	<h1>Export your family tree</h1>
	<p class="muted intro">
		Download your whole tree as a GEDCOM (<code>.ged</code>) file — the standard genealogy
		format. Your uploaded photos are <strong>embedded directly in the file</strong>, so it's a
		complete, self-contained backup you can re-import into Clann or open in other genealogy apps.
	</p>

	<div class="card panel">
		<p class="counts">
			<strong>{data.peopleCount}</strong>
			{data.peopleCount === 1 ? 'person' : 'people'}
			· <strong>{data.photoCount}</strong>
			{data.photoCount === 1 ? 'photo' : 'photos'}
		</p>
		<a class="btn" href="/admin/export/download" data-sveltekit-reload>Download GEDCOM (.ged)</a>
		{#if data.photoCount > 0}
			<p class="muted small note">
				Embedding photos makes the file larger (roughly the size of your photos plus a third).
			</p>
		{/if}
	</div>
</div>

<style>
	.wrap {
		max-width: 640px;
		margin: 0 auto;
		padding: 1.75rem 1.25rem;
	}
	.back {
		display: inline-block;
		margin-bottom: 1rem;
		font-size: 0.9rem;
		color: var(--text-muted);
	}
	h1 {
		margin: 0 0 0.4rem;
	}
	.intro {
		margin: 0 0 1.5rem;
	}
	.panel {
		padding: 1.5rem;
	}
	.counts {
		margin: 0 0 1.25rem;
	}
	.note {
		margin: 1rem 0 0;
	}
	code {
		font-size: 0.85em;
		background: var(--surface-2);
		padding: 0.05rem 0.3rem;
		border-radius: 4px;
	}
</style>
