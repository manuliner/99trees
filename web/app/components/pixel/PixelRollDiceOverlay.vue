<script setup lang="ts">
defineProps<{
  visible: boolean
  value: number | null
}>()
</script>

<template>
  <div
    v-if="visible && value != null"
    class="roll-dice-overlay"
    aria-live="polite"
    :aria-label="String(value)"
  >
    <div class="roll-dice-overlay__backdrop" aria-hidden="true" />
    <div class="roll-dice-overlay__inner">
      <PixelDiceButton
        :value="value"
        tooltip=""
        :interactive="false"
        :loading="false"
        presentational
      />
    </div>
  </div>
</template>

<style scoped>
.roll-dice-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.roll-dice-overlay__backdrop {
  position: absolute;
  inset: 0;
  background: rgb(244 240 232 / 0.88);
}

.roll-dice-overlay__inner {
  position: relative;
  z-index: 1;
  transform: scale(2.25);
  filter: drop-shadow(4px 6px 0 rgb(26 28 44 / 0.4));
  animation: roll-dice-pop 1.2s ease-out;
}

@keyframes roll-dice-pop {
  0% {
    transform: scale(0.55);
  }
  22% {
    transform: scale(2.55);
  }
  38% {
    transform: scale(2.15);
  }
  100% {
    transform: scale(2.25);
  }
}
</style>
