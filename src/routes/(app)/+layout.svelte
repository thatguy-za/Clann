<script lang="ts">
	import { page } from '$app/state';
	import ThemeToggle from '$lib/ThemeToggle.svelte';
	let { data, children } = $props();
	const isAdmin = $derived(data.user.role === 'admin');
	const initial = $derived((data.user.username[0] ?? '?').toUpperCase());

	let accountOpen = $state(false);
	function onWindowClick(e: MouseEvent) {
		if (accountOpen && !(e.target as HTMLElement).closest('.account-menu')) accountOpen = false;
	}
	function onWindowKey(e: KeyboardEvent) {
		if (e.key === 'Escape') accountOpen = false;
	}
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKey} />

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
						<a role="menuitem" href="/admin/import">Import family tree</a>
						<a role="menuitem" href="/admin/export">Export family tree</a>
					</div>
				</div>
			{/if}
		</nav>

		<div class="account">
			<ThemeToggle />
			<div class="account-menu">
				<button
					type="button"
					class="avatar-btn"
					class:open={accountOpen}
					aria-haspopup="menu"
					aria-expanded={accountOpen}
					aria-label="Account menu"
					onclick={() => (accountOpen = !accountOpen)}
				>
					<span class="avatar">{initial}</span>
				</button>
				{#if accountOpen}
					<div class="account-dropdown" role="menu">
						<a
							class="account-name"
							role="menuitem"
							href="/account"
							onclick={() => (accountOpen = false)}
						>
							<span class="avatar sm">{initial}</span>
							<span class="account-name-text">{data.user.username}</span>
						</a>
						<div class="account-divider"></div>
						{#if isAdmin}
							<a
								class="account-item"
								role="menuitem"
								href="/admin/users"
								onclick={() => (accountOpen = false)}
							>
								Manage users
							</a>
						{/if}
						<form method="POST" action="/logout">
							<button class="account-item" type="submit">Log out</button>
						</form>
					</div>
				{/if}
			</div>
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
		gap: 0.75rem;
	}
	.account-menu {
		position: relative;
	}
	.avatar-btn {
		padding: 0;
		border: none;
		background: none;
		border-radius: 50%;
		cursor: pointer;
		line-height: 0;
	}
	.avatar-btn:hover .avatar,
	.avatar-btn.open .avatar {
		box-shadow: 0 0 0 2px var(--primary);
	}
	.avatar {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: var(--primary);
		color: #fff;
		font-weight: 600;
		font-size: 0.95rem;
		flex-shrink: 0;
		transition: box-shadow 0.12s ease;
	}
	.avatar.sm {
		width: 30px;
		height: 30px;
		font-size: 0.85rem;
	}
	.account-dropdown {
		position: absolute;
		top: calc(100% + 0.4rem);
		right: 0;
		min-width: 200px;
		padding: 0.35rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		box-shadow: var(--shadow);
		z-index: 20;
	}
	.account-name {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.5rem 0.6rem;
		border-radius: var(--radius-sm);
		color: var(--text);
		font-weight: 600;
	}
	.account-name:hover {
		background: var(--surface-2);
		text-decoration: none;
	}
	.account-name-text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.account-divider {
		height: 1px;
		background: var(--border);
		margin: 0.35rem 0;
	}
	.account-item {
		display: block;
		box-sizing: border-box;
		width: 100%;
		text-align: left;
		padding: 0.5rem 0.6rem;
		border: none;
		background: none;
		border-radius: var(--radius-sm);
		color: var(--text);
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
	}
	.account-item:hover {
		background: var(--surface-2);
		text-decoration: none;
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
	}
</style>
