<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PersonSummary } from '$lib/server/buildGraph';

	let {
		anchor,
		hasParents,
		onClose
	}: { anchor: PersonSummary; hasParents: boolean; onClose: () => void } = $props();

	type Rel = { key: string; label: string };
	const GROUPS: { title: string; items: Rel[] }[] = [
		{ title: 'Parents', items: [{ key: 'father', label: 'Father' }, { key: 'mother', label: 'Mother' }] },
		{ title: 'Siblings', items: [{ key: 'brother', label: 'Brother' }, { key: 'sister', label: 'Sister' }] },
		{ title: 'Partner', items: [{ key: 'partner', label: 'Partner' }] },
		{ title: 'Children', items: [{ key: 'son', label: 'Son' }, { key: 'daughter', label: 'Daughter' }] }
	];
	const LABELS: Record<string, string> = Object.fromEntries(
		GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.label]))
	);

	let relation = $state<string | null>(null);
	let error = $state('');
	let submitting = $state(false);

	const name = $derived([anchor.givenName, anchor.familyName].filter(Boolean).join(' '));
	const isPartner = $derived(relation === 'partner');
	const relLabel = $derived(relation ? LABELS[relation] : '');
	// Children and siblings usually share the anchor's family name; prefill it.
	const prefillFamily = $derived(
		relation && ['son', 'daughter', 'brother', 'sister'].includes(relation) ? anchor.familyName ?? '' : ''
	);

	function isDisabled(key: string) {
		return (key === 'brother' || key === 'sister') && !hasParents;
	}
	function pick(key: string) {
		if (isDisabled(key)) return;
		error = '';
		relation = key;
	}
	function back() {
		relation = null;
		error = '';
	}
	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
	function focusOnMount(node: HTMLElement) {
		node.focus();
	}

	const submit = () => {
		submitting = true;
		return async ({ result }: { result: { type: string; data?: Record<string, unknown> } }) => {
			submitting = false;
			if (result.type === 'success') {
				await invalidateAll();
				onClose();
			} else if (result.type === 'failure') {
				error = (result.data?.error as string) ?? 'Could not add this person.';
			} else if (result.type === 'error') {
				error = 'Something went wrong. Please try again.';
			}
		};
	};
</script>

<svelte:window onkeydown={onKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="backdrop" onclick={onClose}>
	<div
		class="modal card"
		role="dialog"
		aria-modal="true"
		aria-label="Add a relative"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
	>
		<header>
			<div>
				<h2>Add a relative</h2>
				<p class="muted sub">Related to <strong>{name}</strong></p>
			</div>
			<button class="close" type="button" onclick={onClose} aria-label="Close">✕</button>
		</header>

		{#if !relation}
			<div class="groups">
				{#each GROUPS as g (g.title)}
					<div class="group">
						<span class="group-title">{g.title}</span>
						<div class="rel-buttons">
							{#each g.items as r (r.key)}
								<button
									class="rel-btn"
									type="button"
									disabled={isDisabled(r.key)}
									title={isDisabled(r.key) ? 'Add a parent first' : ''}
									onclick={() => pick(r.key)}
								>
									{r.label}
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
			{#if !hasParents}
				<p class="hint muted">Add a parent before you can add brothers or sisters.</p>
			{/if}
		{:else}
			<form method="POST" action="?/addRelative" use:enhance={submit}>
				<input type="hidden" name="anchorId" value={anchor.id} />
				<input type="hidden" name="relation" value={relation} />
				<h3>Add {relLabel.toLowerCase()}</h3>
				{#if error}<div class="error">{error}</div>{/if}

				<div class="field">
					<label for="rel-given">Given name</label>
					<input id="rel-given" name="givenName" required use:focusOnMount />
				</div>
				<div class="field">
					<label for="rel-family">Family name</label>
					<input id="rel-family" name="familyName" value={prefillFamily} />
				</div>

				{#if isPartner}
					<div class="row">
						<div class="field">
							<label for="rel-sex">Sex</label>
							<select id="rel-sex" name="sex">
								<option value="female" selected={anchor.sex === 'male'}>Female</option>
								<option value="male" selected={anchor.sex === 'female'}>Male</option>
							</select>
						</div>
						<div class="field">
							<label for="rel-kind">Relationship</label>
							<select id="rel-kind" name="spouseKind">
								<option value="married">Married</option>
								<option value="divorced">Divorced / ex</option>
							</select>
						</div>
					</div>
				{/if}

				<div class="field">
					<label for="rel-born">Born</label>
					<input id="rel-born" name="birthDate" placeholder="Date (YYYY/MM/DD)" />
				</div>

				<div class="actions">
					<button type="button" class="btn-secondary" onclick={back}>Back</button>
					<button type="submit" disabled={submitting}>
						{submitting ? 'Adding…' : `Add ${relLabel.toLowerCase()}`}
					</button>
				</div>
			</form>
		{/if}
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: grid;
		place-items: center;
		padding: 1rem;
		z-index: 100;
	}
	.modal {
		width: 100%;
		max-width: 420px;
		padding: 1.5rem;
		max-height: 90vh;
		overflow-y: auto;
	}
	header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	header h2 {
		margin: 0;
		font-size: 1.15rem;
	}
	.sub {
		margin: 0.2rem 0 0;
		font-size: 0.9rem;
	}
	.close {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 1.1rem;
		cursor: pointer;
		padding: 0.2rem 0.4rem;
		border-radius: var(--radius-sm);
	}
	.close:hover {
		background: var(--surface-2);
		color: var(--text);
	}
	.groups {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.group-title {
		display: block;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		margin-bottom: 0.4rem;
	}
	.rel-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.rel-btn {
		flex: 1;
		min-width: 120px;
		padding: 0.6rem 0.75rem;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		color: var(--text);
		font-weight: 500;
		cursor: pointer;
		transition: background 0.12s, border-color 0.12s;
	}
	.rel-btn:hover:not(:disabled) {
		border-color: var(--primary);
		color: var(--primary);
	}
	.rel-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.hint {
		margin: 1rem 0 0;
		font-size: 0.85rem;
	}
	form h3 {
		margin: 0 0 1rem;
		font-size: 1rem;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.6rem;
		margin-top: 1.25rem;
	}
</style>
