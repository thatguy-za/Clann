<script lang="ts">
	import FamilyTree from '$lib/tree/FamilyTree.svelte';
	let { data } = $props();
</script>

<svelte:head><title>Clann</title></svelte:head>

<FamilyTree tree={data.tree} />
