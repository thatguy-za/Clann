<script lang="ts">
	import FamilyTree from '$lib/tree/FamilyTree.svelte';
	let { data } = $props();
</script>

<svelte:head><title>Clann - {data.treeName}</title></svelte:head>

<FamilyTree tree={data.tree} isAdmin={data.isAdmin} />
