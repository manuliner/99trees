<script setup lang="ts">
const route = useRoute()
const editionId = computed(() => Number(route.query.edition) || 1)

await navigateTo({ path: '/join', query: { edition: String(editionId.value) } })
</script>

<template>
  <div />
</template>
