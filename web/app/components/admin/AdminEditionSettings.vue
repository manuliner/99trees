<script setup lang="ts">
import { cloneEditionConfig, type EditionConfig, type EditionStatus } from '#shared/types'

const props = defineProps<{
  name: string
  slug: string
  status: EditionStatus
  config: EditionConfig
  joinUrl: string
}>()

const emit = defineEmits<{
  save: [payload: { name: string; slug: string; config: EditionConfig }]
}>()

const localName = ref(props.name)
const localSlug = ref(props.slug)
const localConfig = ref<EditionConfig>(cloneEditionConfig(props.config))

watch(
  () => [props.name, props.slug, props.config] as const,
  ([n, s, c]) => {
    localName.value = n
    localSlug.value = s
    localConfig.value = cloneEditionConfig(c)
  },
)

const slugLocked = computed(() => props.status !== 'draft')

function onSave() {
  emit('save', {
    name: localName.value,
    slug: localSlug.value,
    config: localConfig.value,
  })
}
</script>

<template>
  <div class="space-y-3">
    <p class="admin-body text-xs opacity-80">
      Set the public URL slug before go-live. Slug cannot change after the edition is live.
    </p>
    <label class="admin-body text-sm block">Name</label>
    <input v-model="localName" class="pixel-input w-full p-2 admin-body">
    <label class="admin-body text-sm block">URL slug</label>
    <input
      v-model="localSlug"
      :disabled="slugLocked"
      placeholder="e.g. zv26"
      class="pixel-input w-full p-2 admin-body"
    >
    <p v-if="joinUrl" class="admin-body text-xs break-all">
      Join URL: {{ joinUrl }}
    </p>

    <p class="pixel-title text-xs pt-2">Game rules</p>
    <div class="grid grid-cols-2 gap-2">
      <label class="admin-body text-xs col-span-2">Dice (min – max)</label>
      <input
        v-model.number="localConfig.diceMin"
        type="number"
        min="1"
        class="pixel-input p-2 admin-body"
      >
      <input
        v-model.number="localConfig.diceMax"
        type="number"
        min="1"
        class="pixel-input p-2 admin-body"
      >
      <label class="admin-body text-xs col-span-2">Hint timer (minutes, 3 levels)</label>
      <input
        v-for="(_, i) in localConfig.hintTimerMinutes"
        :key="i"
        v-model.number="localConfig.hintTimerMinutes[i]"
        type="number"
        min="1"
        class="pixel-input p-2 admin-body"
      >
      <label class="admin-body text-xs col-span-2">Performance timeout (minutes)</label>
      <input
        v-model.number="localConfig.performanceTimeoutMinutes"
        type="number"
        min="1"
        class="pixel-input p-2 admin-body col-span-2"
      >
    </div>

    <PixelButton variant="secondary" @click="onSave">Save edition settings</PixelButton>
  </div>
</template>
