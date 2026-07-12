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
				<div class="menu">
					<button
						type="button"
						class="nav-link kebab"
						class:active={page.url.pathname.startsWith('/admin')}
						aria-haspopup="menu"
						aria-label="Manage"
						title="Manage"
					>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
							<circle cx="12" cy="5" r="2" />
							<circle cx="12" cy="12" r="2" />
							<circle cx="12" cy="19" r="2" />
						</svg>
					</button>
					<div class="dropdown" role="menu">
						<a role="menuitem" href="/admin">Add new person</a>
						<a role="menuitem" href="/admin/users">Manage users</a>
					</div>
				</div>
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

	/* Kebab (three-dots) menu */
	.menu {
		position: relative;
	}
	.kebab {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.35rem 0.5rem;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-muted);
	}
	.kebab:hover {
		background: var(--surface-2);
		color: var(--text);
	}
	.dropdown {
		position: absolute;
		top: calc(100% + 0.35rem);
		left: 0;
		min-width: 170px;
		display: flex;
		flex-direction: column;
		padding: 0.3rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		box-shadow: var(--shadow);
		opacity: 0;
		visibility: hidden;
		transform: translateY(-4px);
		transition:
			opacity 0.12s ease,
			transform 0.12s ease,
			visibility 0.12s;
		z-index: 20;
	}
	/* Bridge the gap so the dropdown stays open while the pointer travels to it */
	.dropdown::before {
		content: '';
		position: absolute;
		bottom: 100%;
		left: 0;
		right: 0;
		height: 0.35rem;
	}
	.menu:hover .dropdown,
	.menu:focus-within .dropdown {
		opacity: 1;
		visibility: visible;
		transform: translateY(0);
	}
	.dropdown a {
		padding: 0.45rem 0.6rem;
		border-radius: var(--radius-sm);
		color: var(--text);
		font-size: 0.9rem;
		font-weight: 500;
		white-space: nowrap;
	}
	.dropdown a:hover {
		background: var(--surface-2);
		text-decoration: none;
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
