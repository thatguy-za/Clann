<script lang="ts">
	import { page } from '$app/state';
	import ThemeToggle from '$lib/ThemeToggle.svelte';
	let { data, children } = $props();
	const isAdmin = $derived(data.user.role === 'admin');
</script>

<div class="app">
	<header class="topbar">
		<a class="brand" href="/">
			<span class="brand-mark">⛬</span>
			<span>Clann</span>
		</a>

		<nav class="nav">
			<a class="nav-link" class:active={page.url.pathname === '/'} href="/">Tree</a>
			{#if isAdmin}
				<a
					class="nav-link"
					class:active={page.url.pathname.startsWith('/admin')}
					href="/admin">Manage</a
				>
			{/if}
		</nav>

		<div class="account">
			<ThemeToggle />
			<span class="user">
				{data.user.username}
				<span class="role-badge" class:admin={isAdmin}>{data.user.role}</span>
			</span>
			<form method="POST" action="/logout">
				<button class="btn-secondary" type="submit">Sign out</button>
			</form>
		</div>
	</header>

	<main class="content">
		{@render children()}
	</main>
</div>

<style>
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}
	.topbar {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 0.7rem 1.25rem;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
		position: sticky;
		top: 0;
		z-index: 10;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 700;
		font-size: 1.05rem;
		color: var(--text);
	}
	.brand:hover {
		text-decoration: none;
	}
	.brand-mark {
		color: var(--primary);
		font-size: 1.3rem;
	}
	.nav {
		display: flex;
		gap: 0.35rem;
		margin-right: auto;
	}
	.nav-link {
		padding: 0.4rem 0.75rem;
		border-radius: var(--radius-sm);
		color: var(--text-muted);
		font-weight: 500;
	}
	.nav-link:hover {
		background: var(--surface-2);
		text-decoration: none;
		color: var(--text);
	}
	.nav-link.active {
		background: var(--primary-soft);
		color: var(--primary);
	}
	.account {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.user {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 500;
		font-size: 0.9rem;
	}
	.role-badge {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 0.15rem 0.45rem;
		border-radius: 100px;
		background: var(--surface-2);
		color: var(--text-muted);
		font-weight: 600;
	}
	.role-badge.admin {
		background: var(--primary-soft);
		color: var(--primary);
	}
	.content {
		flex: 1;
		width: 100%;
	}
	@media (max-width: 640px) {
		.topbar {
			gap: 0.75rem;
			flex-wrap: wrap;
		}
		.user :global(span) {
			display: none;
		}
	}
</style>
