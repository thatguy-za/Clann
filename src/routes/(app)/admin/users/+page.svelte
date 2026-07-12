<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	let { data, form } = $props();

	let resettingId = $state<string | null>(null);
</script>

<svelte:head><title>User accounts · Clann</title></svelte:head>

<div class="wrap">
	<div class="head">
		<h1>User accounts</h1>
		<a class="btn-secondary btn" href="/admin">← Back to people</a>
	</div>

	{#if form?.error}<div class="error">{form.error}</div>{/if}

	<div class="grid">
		<section class="card panel">
			<h2>Add a user</h2>
			<form
				method="POST"
				action="?/create"
				use:enhance={() => async ({ update }) => update({ reset: true })}
			>
				<div class="field">
					<label for="username">Username</label>
					<input id="username" name="username" autocomplete="off" required />
				</div>
				<div class="field">
					<label for="password">Password</label>
					<input id="password" name="password" type="password" autocomplete="new-password" required />
				</div>
				<div class="field">
					<label for="role">Role</label>
					<select id="role" name="role">
						<option value="viewer">Viewer (read-only)</option>
						<option value="admin">Admin (full access)</option>
					</select>
				</div>
				<button type="submit">Create user</button>
			</form>
		</section>

		<section class="card panel">
			<h2>Existing users <span class="muted">({data.users.length})</span></h2>
			<ul class="users">
				{#each data.users as u (u.id)}
					<li>
						<div class="uinfo">
							<span class="uname">{u.username}</span>
							{#if u.id === page.data.user.id}<span class="you">you</span>{/if}
						</div>

						<form method="POST" action="?/setRole" use:enhance class="rolef">
							<input type="hidden" name="id" value={u.id} />
							<select name="role" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
								<option value="viewer" selected={u.role === 'viewer'}>Viewer</option>
								<option value="admin" selected={u.role === 'admin'}>Admin</option>
							</select>
						</form>

						<button
							class="btn-secondary mini"
							onclick={() => (resettingId = resettingId === u.id ? null : u.id)}
						>
							Password
						</button>

						{#if u.id !== page.data.user.id}
							<form
								method="POST"
								action="?/delete"
								use:enhance
								onsubmit={(e) => {
									if (!confirm(`Delete user ${u.username}?`)) e.preventDefault();
								}}
							>
								<input type="hidden" name="id" value={u.id} />
								<button class="btn-danger mini" type="submit" title="Delete user">✕</button>
							</form>
						{/if}

						{#if resettingId === u.id}
							<form
								method="POST"
								action="?/resetPassword"
								use:enhance={() => async ({ update }) => {
									resettingId = null;
									await update();
								}}
								class="resetf"
							>
								<input type="hidden" name="id" value={u.id} />
								<input
									name="password"
									type="password"
									placeholder="New password"
									autocomplete="new-password"
									required
								/>
								<button type="submit" class="mini">Set</button>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	</div>
</div>

<style>
	.wrap {
		max-width: 860px;
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
	.grid {
		display: grid;
		grid-template-columns: 320px 1fr;
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
	.users {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.users li {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.6rem 0;
		border-bottom: 1px solid var(--border);
		flex-wrap: wrap;
	}
	.users li:last-child {
		border-bottom: none;
	}
	.uinfo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-right: auto;
	}
	.uname {
		font-weight: 600;
	}
	.you {
		font-size: 0.7rem;
		text-transform: uppercase;
		background: var(--primary-soft);
		color: var(--primary);
		padding: 0.1rem 0.4rem;
		border-radius: 100px;
		font-weight: 600;
	}
	.users form {
		margin: 0;
	}
	.rolef select {
		width: auto;
		padding: 0.35rem 0.5rem;
		font-size: 0.85rem;
	}
	.mini {
		padding: 0.35rem 0.6rem;
		font-size: 0.82rem;
	}
	.resetf {
		flex-basis: 100%;
		display: flex;
		gap: 0.5rem;
		margin-top: 0.4rem;
	}
	.resetf input {
		max-width: 220px;
	}
	@media (max-width: 720px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
