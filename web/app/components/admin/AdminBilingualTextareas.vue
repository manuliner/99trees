<script setup lang="ts">
const de = defineModel<string>('de', { required: true })
const en = defineModel<string>('en', { required: true })

withDefaults(
  defineProps<{
    label: string
    rows?: number
    mono?: boolean
  }>(),
  {
    rows: 2,
    mono: false,
  },
)
</script>

<template>
  <div class="space-y-2">
    <p class="admin-body text-xs">{{ label }}</p>
    <label class="admin-body text-xs block">DE</label>
    <textarea
      v-model="de"
      :rows="rows"
      class="w-full p-2 border-4 border-[var(--pixel-forest-dark)] admin-body text-xs"
      :class="{ 'font-mono': mono }"
    />
    <label class="admin-body text-xs block">EN</label>
    <textarea
      v-model="en"
      :rows="rows"
      class="w-full p-2 border-4 border-[var(--pixel-forest-dark)] admin-body text-xs"
      :class="{ 'font-mono': mono }"
    />
  </div>
</template>
