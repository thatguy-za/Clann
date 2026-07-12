<script lang="ts">
	import { enhance } from '$app/forms';
	import ThemeToggle from '$lib/ThemeToggle.svelte';
	let { form } = $props();
</script>

<svelte:head><title>Set up · Clann</title></svelte:head>

<div class="theme-corner"><ThemeToggle /></div>
<div class="auth-shell">
	<div class="card auth-card">
		<h1>Welcome</h1>
		<p class="muted" style="margin-top:-0.3rem;margin-bottom:1.4rem;">
			Create the administrator account to get started.
		</p>

		{#if form?.error}
			<div class="error">{form.error}</div>
		{/if}

		<form method="POST" use:enhance>
			<div class="field">
				<label for="username">Username</label>
				<input
					id="username"
					name="username"
					autocomplete="username"
					value={form?.username ?? ''}
					required
				/>
			</div>
			<div class="field">
				<label for="password">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					autocomplete="new-password"
					required
				/>
			</div>
			<div class="field">
				<label for="confirm">Confirm password</label>
				<input
					id="confirm"
					name="confirm"
					type="password"
					autocomplete="new-password"
					required
				/>
			</div>
			<button type="submit" style="width:100%;justify-content:center;">
				Create admin account
			</button>
		</form>
	</div>
</div>
