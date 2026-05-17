<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string
    tooltip?: string
    variant?: 'primary' | 'secondary' | 'accent' | 'highlight' | 'danger'
    disabled?: boolean
  }>(),
  {
    variant: 'secondary',
    disabled: false,
  },
)

const emit = defineEmits<{ click: [] }>()

const tooltipText = computed(() => props.tooltip ?? props.label)
</script>

<template>
  <PixelTooltip :text="tooltipText" :gap="6" class="pixel-icon-btn">
    <button
      type="button"
      class="pixel-btn pixel-icon-btn__btn"
      :class="`pixel-btn--${variant}`"
      :aria-label="label"
      :disabled="disabled"
      @click="emit('click')"
    >
      <slot />
    </button>
  </PixelTooltip>
</template>

<style scoped>
.pixel-icon-btn__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  min-height: 0;
  padding: 0;
}

.pixel-icon-btn__btn :deep(svg) {
  display: block;
  width: 1.125rem;
  height: 1.125rem;
}
</style>
