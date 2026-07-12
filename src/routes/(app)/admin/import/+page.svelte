<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	let fileName = $state('');
	let submitting = $state(false);

	const currentCount = $derived(data.currentCount);

	function onFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		fileName = input.files?.[0]?.name ?? '';
	}
</script>

<svelte:head><title>Import GEDCOM · Clann</title></svelte:head>

<div class="wrap">
	<a class="back" href="/">← Back to tree</a>
	<h1>Import a GEDCOM tree</h1>
	<p class="muted intro">
		Import a family tree from a <code>.ged</code> file (the standard genealogy export
		format used by Ancestry, MyHeritage, Gramps and others).
	</p>

	{#if form?.imported}
		<div class="card panel success">
			<h2>Import complete</h2>
			<p>
				Imported <strong>{form.imported.people}</strong>
				{form.imported.people === 1 ? 'person' : 'people'} and
				<strong>{form.imported.relationships}</strong> relationships from
				<code>{form.imported.filename}</code>.
			</p>
			{#if form.imported.events || form.imported.photos}
				<p class="muted extras">
					Also imported {form.imported.events}
					{form.imported.events === 1 ? 'life event' : 'life events'}
					and {form.imported.photos}
					{form.imported.photos === 1 ? 'photo' : 'photos'}.
				</p>
			{/if}
			<a class="btn" href="/">View the tree</a>
		</div>
	{:else}
		<div class="card panel warn">
			<strong>⚠ This replaces your entire tree.</strong>
			<p>
				Importing will <strong>permanently delete</strong>
				{#if currentCount > 0}
					all {currentCount} {currentCount === 1 ? 'person' : 'people'} currently in Clann
					(and their photos, events and relationships)
				{:else}
					everything currently in Clann
				{/if}
				and replace it with the contents of the file. This cannot be undone.
			</p>
		</div>

		<form
			class="card panel"
			method="POST"
			action="?/import"
			enctype="multipart/form-data"
			use:enhance={({ cancel }) => {
				const proceed = confirm(
					currentCount > 0
						? `This will permanently delete all ${currentCount} ${currentCount === 1 ? 'person' : 'people'} in Clann and replace them with the imported tree.\n\nThis cannot be undone. Continue?`
						: 'Import this GEDCOM file and replace the current tree? This cannot be undone.'
				);
				if (!proceed) {
					cancel();
					return;
				}
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			{#if form?.error}<div class="error">{form.error}</div>{/if}

			<div class="field">
				<label for="gedcom">GEDCOM file</label>
				<input
					id="gedcom"
					name="gedcom"
					type="file"
					accept=".ged,.gedcom,text/plain"
					required
					onchange={onFileChange}
				/>
				{#if fileName}<span class="muted picked">Selected: {fileName}</span>{/if}
			</div>

			<button type="submit" class="btn-danger" disabled={submitting}>
				{submitting ? 'Importing…' : 'Import & overwrite tree'}
			</button>
		</form>
	{/if}
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
		padding: 1.25rem;
		margin-bottom: 1.25rem;
	}
	.warn {
		border-color: var(--danger);
		background: var(--danger-soft);
	}
	.warn > strong {
		display: block;
		margin-bottom: 0.35rem;
	}
	.warn p {
		margin: 0;
		font-size: 0.92rem;
	}
	.success h2 {
		margin: 0 0 0.5rem;
	}
	.success .btn {
		margin-top: 1rem;
	}
	.picked {
		display: block;
		margin-top: 0.5rem;
		font-size: 0.85rem;
	}
	code {
		font-size: 0.85em;
		background: var(--surface-2);
		padding: 0.05rem 0.3rem;
		border-radius: 4px;
	}
</style>
