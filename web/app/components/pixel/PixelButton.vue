<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'accent' | 'highlight' | 'danger'
    disabled?: boolean
    type?: 'button' | 'submit'
  }>(),
  { variant: 'primary', disabled: false, type: 'button' },
)
</script>

<template>
  <button
    :type="type"
    class="pixel-btn w-full"
    :class="`pixel-btn--${variant}`"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
