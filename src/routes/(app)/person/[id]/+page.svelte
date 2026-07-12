<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	const d = $derived(data.detail);
	const primary = $derived(d.photos.find((p) => p.isPrimary) ?? d.photos[0]);

	function fullName(p: { givenName: string; familyName: string | null }) {
		return [p.givenName, p.familyName].filter(Boolean).join(' ');
	}
	const lifespan = $derived(
		[d.person.birthDate, d.person.deathDate].some(Boolean)
			? `${d.person.birthDate ?? '?'} – ${d.person.deathDate ?? ''}`.trim()
			: ''
	);
	// People available to link (exclude self).
	const others = $derived(data.allPeople.filter((p) => p.id !== d.person.id));

	let editing = $state(false);
</script>

<svelte:head><title>{fullName(d.person)} · Clann</title></svelte:head>

<div class="wrap">
	<a href="/" class="back">← Back to tree</a>

	<div class="layout">
		<!-- Left: profile -->
		<div class="col">
			<section class="card profile">
				<div class="avatar" class:female={d.person.sex === 'female'}>
					{#if primary}
						<img src={`/api/photos/${primary.id}`} alt={fullName(d.person)} />
					{:else}
						<span>{d.person.givenName[0] ?? '?'}</span>
					{/if}
				</div>
				<h1>{fullName(d.person)}</h1>
				{#if lifespan}<p class="lifespan muted">{lifespan}</p>{/if}
				{#if d.person.occupation}<p class="occ">{d.person.occupation}</p>{/if}
				{#if d.person.bio}<p class="bio">{d.person.bio}</p>{/if}

				{#if data.isAdmin}
					<div class="admin-actions">
						<button class="btn-secondary" onclick={() => (editing = !editing)}>
							{editing ? 'Cancel edit' : 'Edit details'}
						</button>
						<form
							method="POST"
							action="?/delete"
							use:enhance
							onsubmit={(e) => {
								if (!confirm('Delete this person permanently?')) e.preventDefault();
							}}
						>
							<button class="btn-danger" type="submit">Delete</button>
						</form>
					</div>
				{/if}
			</section>

			{#if data.isAdmin && editing}
				<section class="card panel">
					<h2>Edit details</h2>
					{#if form?.error}<div class="error">{form.error}</div>{/if}
					<form method="POST" action="?/update" use:enhance>
						<div class="row">
							<div class="field">
								<label for="givenName">Given name</label>
								<input id="givenName" name="givenName" value={d.person.givenName} required />
							</div>
							<div class="field">
								<label for="familyName">Family name</label>
								<input id="familyName" name="familyName" value={d.person.familyName ?? ''} />
							</div>
						</div>
						<div class="row">
							<div class="field">
								<label for="sex">Sex</label>
								<select id="sex" name="sex">
									<option value="male" selected={d.person.sex === 'male'}>Male</option>
									<option value="female" selected={d.person.sex === 'female'}>Female</option>
								</select>
							</div>
							<div class="field">
								<label for="birthDate">Born</label>
								<input
									id="birthDate"
									name="birthDate"
									value={d.person.birthDate ?? ''}
									placeholder="Date (YYYY/MM/DD)"
								/>
							</div>
							<div class="field">
								<label for="deathDate">Died</label>
								<input
									id="deathDate"
									name="deathDate"
									value={d.person.deathDate ?? ''}
									placeholder="Date (YYYY/MM/DD)"
								/>
							</div>
						</div>
						<div class="field">
							<label for="occupation">Occupation</label>
							<input id="occupation" name="occupation" value={d.person.occupation ?? ''} />
						</div>
						<div class="field">
							<label for="bio">Biography</label>
							<textarea id="bio" name="bio">{d.person.bio ?? ''}</textarea>
						</div>
						<button type="submit">Save changes</button>
					</form>
				</section>
			{/if}

			<!-- Photos -->
			<section class="card panel">
				<h2>Photos</h2>
				{#if d.photos.length}
					<div class="gallery">
						{#each d.photos as ph (ph.id)}
							<div class="thumb" class:isprimary={ph.isPrimary}>
								<img src={`/api/photos/${ph.id}`} alt="" />
								{#if data.isAdmin}
									<div class="thumb-actions">
										{#if !ph.isPrimary}
											<form method="POST" action="?/setPrimaryPhoto" use:enhance>
												<input type="hidden" name="photoId" value={ph.id} />
												<button class="mini" title="Make primary">★</button>
											</form>
										{/if}
										<form method="POST" action="?/deletePhoto" use:enhance>
											<input type="hidden" name="photoId" value={ph.id} />
											<button class="mini danger" title="Remove">✕</button>
										</form>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<p class="muted">No photos yet.</p>
				{/if}
				{#if data.isAdmin}
					<form
						method="POST"
						action="?/addPhoto"
						enctype="multipart/form-data"
						use:enhance={() => async ({ update }) => update({ reset: true })}
						class="upload"
					>
						<input type="file" name="photo" accept="image/*" required />
						<button type="submit">Upload</button>
					</form>
				{/if}
			</section>
		</div>

		<!-- Right: relationships + events -->
		<div class="col">
			<section class="card panel">
				<h2>Family</h2>
				{#each [{ label: 'Parents', list: d.parents, rel: 'parent' }, { label: 'Spouses', list: d.spouses, rel: 'spouse' }, { label: 'Children', list: d.children, rel: 'child' }] as group}
					<div class="relgroup">
						<h3>{group.label}</h3>
						{#if group.list.length}
							<ul class="rellist">
								{#each group.list as r (r.relId)}
									<li>
										<a href={`/person/${r.person.id}`}>
											<span class="dot" class:female={r.person.sex === 'female'}></span>
											{fullName(r.person)}
										</a>
										{#if r.kind !== 'blood' && r.kind !== 'married'}
											<span class="kind">{r.kind}</span>
										{/if}
										{#if data.isAdmin}
											<form method="POST" action="?/removeRelation" use:enhance>
												<input type="hidden" name="relId" value={r.relId} />
												<button class="mini danger" title="Unlink">✕</button>
											</form>
										{/if}
									</li>
								{/each}
							</ul>
						{:else}
							<p class="muted small">None recorded.</p>
						{/if}
					</div>
				{/each}

				{#if data.isAdmin && others.length}
					<form method="POST" action="?/addRelation" use:enhance class="addrel">
						<h3>Add relationship</h3>
						<div class="row">
							<select name="rel">
								<option value="parent">Parent</option>
								<option value="spouse">Spouse</option>
								<option value="child">Child</option>
							</select>
							<select name="otherId" required>
								<option value="">Select person…</option>
								{#each others as p (p.id)}
									<option value={p.id}>{fullName(p)}</option>
								{/each}
							</select>
						</div>
						<button type="submit" class="btn-secondary">Link</button>
					</form>
				{/if}
			</section>

			<!-- Life events -->
			<section class="card panel">
				<h2>Life events</h2>
				{#if d.events.length}
					<ul class="events">
						{#each d.events as ev (ev.id)}
							<li>
								<div class="ev-main">
									<strong>{ev.type}</strong>
									{#if ev.date}<span class="muted"> · {ev.date}</span>{/if}
									{#if ev.place}<div class="muted small">{ev.place}</div>{/if}
									{#if ev.description}<div class="small">{ev.description}</div>{/if}
								</div>
								{#if data.isAdmin}
									<form method="POST" action="?/deleteEvent" use:enhance>
										<input type="hidden" name="eventId" value={ev.id} />
										<button class="mini danger" title="Delete">✕</button>
									</form>
								{/if}
							</li>
						{/each}
					</ul>
				{:else}
					<p class="muted">No events recorded.</p>
				{/if}

				{#if data.isAdmin}
					<form
						method="POST"
						action="?/addEvent"
						use:enhance={() => async ({ update }) => update({ reset: true })}
						class="addevent"
					>
						<h3>Add event</h3>
						<div class="row">
							<input name="type" placeholder="Type (e.g. Marriage)" required />
							<input name="date" placeholder="Date (YYYY/MM/DD)" />
						</div>
						<input name="place" placeholder="Place" />
						<input name="description" placeholder="Description" />
						<button type="submit" class="btn-secondary">Add event</button>
					</form>
				{/if}
			</section>
		</div>
	</div>
</div>

<style>
	.wrap {
		max-width: 1000px;
		margin: 0 auto;
		padding: 1.5rem 1.25rem 3rem;
	}
	.back {
		display: inline-block;
		margin-bottom: 1rem;
		color: var(--text-muted);
		font-size: 0.9rem;
	}
	.layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.25rem;
		align-items: start;
	}
	.col {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		min-width: 0;
	}
	.profile {
		padding: 1.75rem;
		text-align: center;
	}
	.profile h1 {
		margin: 0.25rem 0 0;
		font-size: 1.5rem;
	}
	.avatar {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		margin: 0 auto 1rem;
		background: var(--male);
		color: #fff;
		display: grid;
		place-items: center;
		font-size: 3rem;
		font-weight: 600;
		overflow: hidden;
	}
	.avatar.female {
		background: var(--female);
	}
	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.lifespan {
		margin: 0.35rem 0;
	}
	.occ {
		font-style: italic;
		margin: 0.35rem 0;
	}
	.bio {
		text-align: left;
		margin-top: 1rem;
		white-space: pre-wrap;
	}
	.admin-actions {
		display: flex;
		gap: 0.6rem;
		justify-content: center;
		margin-top: 1.25rem;
	}
	.admin-actions form {
		margin: 0;
	}
	.panel {
		padding: 1.25rem;
	}
	.panel h2 {
		font-size: 1.05rem;
		margin-bottom: 1rem;
	}
	.panel h3 {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		margin: 1rem 0 0.5rem;
	}
	.row {
		display: flex;
		gap: 0.6rem;
	}
	.row .field {
		flex: 1;
	}
	.gallery {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
		gap: 0.6rem;
	}
	.thumb {
		position: relative;
		aspect-ratio: 1;
		border-radius: var(--radius-sm);
		overflow: hidden;
		border: 2px solid transparent;
	}
	.thumb.isprimary {
		border-color: var(--primary);
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.thumb-actions {
		position: absolute;
		top: 3px;
		right: 3px;
		display: flex;
		gap: 3px;
	}
	.thumb-actions form {
		margin: 0;
	}
	.mini {
		padding: 0.1rem 0.4rem;
		font-size: 0.8rem;
		background: rgba(0, 0, 0, 0.6);
		border: none;
		border-radius: 5px;
		color: #fff;
	}
	.mini:hover {
		background: rgba(0, 0, 0, 0.8);
	}
	.mini.danger:hover {
		background: var(--danger);
	}
	.upload {
		display: flex;
		gap: 0.6rem;
		margin-top: 1rem;
		align-items: center;
	}
	.upload input[type='file'] {
		padding: 0.35rem;
		font-size: 0.85rem;
	}
	.relgroup {
		margin-bottom: 0.5rem;
	}
	.rellist,
	.events {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.rellist li,
	.events li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0;
	}
	.events li {
		align-items: flex-start;
		border-bottom: 1px solid var(--border);
		padding: 0.6rem 0;
	}
	.events li:last-child {
		border-bottom: none;
	}
	.ev-main {
		margin-right: auto;
	}
	.rellist a {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		color: var(--text);
		font-weight: 500;
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
	.kind {
		font-size: 0.7rem;
		text-transform: uppercase;
		color: var(--text-muted);
	}
	.rellist form,
	.events form {
		margin: 0;
	}
	.small {
		font-size: 0.85rem;
	}
	.muted.small {
		font-size: 0.8rem;
	}
	.addrel,
	.addevent {
		margin-top: 1rem;
		border-top: 1px solid var(--border);
		padding-top: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.addrel button,
	.addevent button {
		align-self: flex-start;
	}
	@media (max-width: 760px) {
		.layout {
			grid-template-columns: 1fr;
		}
	}
</style>
