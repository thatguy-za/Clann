<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();
	const isAdmin = $derived(data.user.role === 'admin');
</script>

<svelte:head><title>Your account · Clann</title></svelte:head>

<div class="wrap">
	<a class="back" href="/">← Back to tree</a>
	<h1>Your account</h1>

	<div class="card panel">
		<div class="row">
			<span class="label">Username</span>
			<span>{data.user.username}</span>
		</div>
		<div class="row">
			<span class="label">Role</span>
			<span class="role" class:admin={isAdmin}>{data.user.role}</span>
		</div>
	</div>

	<div class="card panel">
		<h2>Change password</h2>
		{#if form?.saved}<div class="ok">Your password has been updated.</div>{/if}
		{#if form?.error}<div class="error">{form.error}</div>{/if}
		<form
			method="POST"
			action="?/changePassword"
			use:enhance={() => async ({ result, update }) => update({ reset: result.type === 'success' })}
		>
			<div class="field">
				<label for="currentPassword">Current password</label>
				<input
					id="currentPassword"
					name="currentPassword"
					type="password"
					autocomplete="current-password"
					required
				/>
			</div>
			<div class="field">
				<label for="newPassword">New password</label>
				<input
					id="newPassword"
					name="newPassword"
					type="password"
					autocomplete="new-password"
					required
				/>
			</div>
			<div class="field">
				<label for="confirm">Confirm new password</label>
				<input id="confirm" name="confirm" type="password" autocomplete="new-password" required />
			</div>
			<button type="submit">Update password</button>
		</form>
	</div>
</div>

<style>
	.wrap {
		max-width: 520px;
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
		margin: 0 0 1.25rem;
	}
	.panel {
		padding: 1.25rem;
		margin-bottom: 1.25rem;
	}
	.panel h2 {
		margin: 0 0 1rem;
		font-size: 1.05rem;
	}
	.row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.4rem 0;
	}
	.label {
		color: var(--text-muted);
	}
	.role {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 0.15rem 0.45rem;
		border-radius: 100px;
		background: var(--surface-2);
		color: var(--text-muted);
		font-weight: 600;
	}
	.role.admin {
		background: var(--primary-soft);
		color: var(--primary);
	}
	.ok {
		background: var(--primary-soft);
		color: var(--primary);
		padding: 0.6rem 0.8rem;
		border-radius: var(--radius-sm);
		margin-bottom: 1rem;
		font-size: 0.9rem;
	}
</style>
