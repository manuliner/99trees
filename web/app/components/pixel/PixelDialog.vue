<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    scrollable?: boolean
    panelClass?: string
    /** When false, backdrop click does not close the dialog. */
    dismissible?: boolean
  }>(),
  { dismissible: true },
)
const emit = defineEmits<{ close: [] }>()

/** Teleport overlays are client-only; avoids SSR/client teleport hydration drift. */
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <Teleport v-if="mounted && open" to="body">
    <div
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="absolute inset-0 bg-black/50"
        aria-hidden="true"
        @click="props.dismissible ? emit('close') : undefined"
      />
      <div :class="['pixel-card relative w-full max-w-md p-4 space-y-4 z-10', props.panelClass]">
        <div
          v-if="title || $slots['header-actions']"
          class="flex items-start justify-between gap-2"
        >
          <h2 v-if="title" class="pixel-title text-xs min-w-0 flex-1">{{ title }}</h2>
          <slot name="header-actions" />
        </div>
        <div :class="scrollable ? 'max-h-[min(85vh,32rem)] overflow-y-auto space-y-4' : 'contents'">
          <slot />
        </div>
        <slot name="actions" />
      </div>
    </div>
  </Teleport>
</template>
