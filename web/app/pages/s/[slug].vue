<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug as string
const token = route.query.t as string

await navigateTo({
  path: '/play',
  query: { slug, t: token },
})
</script>

<template>
  <div />
</template>
