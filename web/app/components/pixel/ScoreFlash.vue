<script setup lang="ts">
defineProps<{
  delta: number
  visible: boolean
}>()
</script>

<template>
  <Transition name="fade">
    <p
      v-if="visible"
      class="fixed top-20 left-1/2 -translate-x-1/2 z-50 text-lg font-bold pointer-events-none"
      :class="delta >= 0 ? 'score-flash-plus' : 'score-flash-minus'"
    >
      {{ delta >= 0 ? '+' : '' }}{{ delta }} points
    </p>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
