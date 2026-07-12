<script lang="ts">
	import { enhance } from '$app/forms';
	import { APP_VERSION } from '$lib/version';
	let { data, form } = $props();

	function fullName(p: { givenName: string; familyName: string | null }) {
		return [p.givenName, p.familyName].filter(Boolean).join(' ');
	}
</script>

<svelte:head><title>Manage · Clann</title></svelte:head>

<div class="wrap">
	<div class="head">
		<div class="title">
			<h1>Manage people</h1>
			<span class="version" title="App version">Version {APP_VERSION}</span>
		</div>
		<a class="btn-secondary btn" href="/admin/users">User accounts</a>
	</div>

	<div class="grid">
		<section class="card panel">
			<h2>Add a person</h2>
			{#if form?.error}<div class="error">{form.error}</div>{/if}
			<form
				method="POST"
				action="?/create"
				use:enhance={() => {
					return async ({ update }) => update({ reset: true });
				}}
			>
				<div class="field">
					<label for="givenName">Given name</label>
					<input id="givenName" name="givenName" required />
				</div>
				<div class="field">
					<label for="familyName">Family name</label>
					<input id="familyName" name="familyName" />
				</div>
				<div class="row">
					<div class="field" style="flex:1;">
						<label for="sex">Sex</label>
						<select id="sex" name="sex" required>
							<option value="">Select…</option>
							<option value="male">Male</option>
							<option value="female">Female</option>
						</select>
					</div>
					<div class="field" style="flex:1;">
						<label for="birthDate">Born</label>
						<input id="birthDate" name="birthDate" placeholder="Date (YYYY/MM/DD)" />
					</div>
				</div>
				<button type="submit">Add person</button>
			</form>
		</section>

		<section class="card panel">
			<h2>All people <span class="muted">({data.people.length})</span></h2>
			{#if data.people.length === 0}
				<p class="muted">No people yet. Add the first one to start building the tree.</p>
			{:else}
				<ul class="people">
					{#each data.people as p (p.id)}
						<li>
							<a href={`/person/${p.id}`} class="pname">
								<span class="dot" class:female={p.sex === 'female'}></span>
								{fullName(p)}
							</a>
							<span class="dates muted">
								{p.birthDate ?? '?'}{p.deathDate ? ` – ${p.deathDate}` : ''}
							</span>
							<form
								method="POST"
								action="?/delete"
								use:enhance
								onsubmit={(e) => {
									if (!confirm(`Delete ${fullName(p)}? This cannot be undone.`)) e.preventDefault();
								}}
							>
								<input type="hidden" name="id" value={p.id} />
								<button class="btn-danger" type="submit" title="Delete">✕</button>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>

<style>
	.wrap {
		max-width: 960px;
		margin: 0 auto;
		padding: 1.75rem 1.25rem;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.25rem;
	}
	.head h1 {
		margin: 0;
	}
	.title {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
	}
	.version {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-muted, #6b7280);
		background: var(--surface-2, rgba(127, 127, 127, 0.12));
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 0.1rem 0.5rem;
		white-space: nowrap;
	}
	.grid {
		display: grid;
		grid-template-columns: 340px 1fr;
		gap: 1.25rem;
		align-items: start;
	}
	.panel {
		padding: 1.25rem;
	}
	.panel h2 {
		font-size: 1.05rem;
		margin-bottom: 1rem;
	}
	.row {
		display: flex;
		gap: 0.75rem;
	}
	.people {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.people li {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.55rem 0;
		border-bottom: 1px solid var(--border);
	}
	.people li:last-child {
		border-bottom: none;
	}
	.pname {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 500;
		color: var(--text);
		margin-right: auto;
	}
	.dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--male);
		flex-shrink: 0;
	}
	.dot.female {
		background: var(--female);
	}
	.dates {
		font-size: 0.85rem;
	}
	.people form {
		margin: 0;
	}
	.people .btn-danger {
		padding: 0.25rem 0.55rem;
		font-size: 0.85rem;
	}
	@media (max-width: 720px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
