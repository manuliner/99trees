<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug as string
const token = route.query.t as string

const query: Record<string, string> = { slug, t: token }

await navigateTo({ path: '/play', query })
</script>

<template>
  <div />
</template>
