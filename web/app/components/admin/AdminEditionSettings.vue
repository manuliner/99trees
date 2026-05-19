<script setup lang="ts">
import { cloneEditionConfig, type EditionConfig, type EditionStatus } from '#shared/types'
import type { LocalizedString } from '#shared/localized'
import {
  EDITION_COLOR_PALETTES,
  EDITION_COLOR_PALETTE_LABELS,
  EDITION_COLOR_PALETTE_PREVIEW,
  type EditionColorPalette,
} from '#shared/pixel-palettes'
import { useEditionThemeOverride } from '~/composables/useEditionTheme'

const props = defineProps<{
  name: string
  slug: string
  status: EditionStatus
  config: EditionConfig
  joinDescription: LocalizedString
  joinLogoUrl: string | null
  shareUrl: string
}>()

const emit = defineEmits<{
  save: [payload: { name: string; slug: string; config: EditionConfig; joinDescription: LocalizedString }]
  uploadLogo: [file: File]
}>()

const localName = ref(props.name)
const localSlug = ref(props.slug)
const localConfig = ref<EditionConfig>(cloneEditionConfig(props.config))
const localJoinDescription = ref<LocalizedString>({ ...props.joinDescription })

const logoInputRef = ref<HTMLInputElement | null>(null)
const themeOverride = useEditionThemeOverride()

watch(
  () => [props.name, props.slug, props.config, props.joinDescription] as const,
  ([n, s, c, d]) => {
    localName.value = n
    localSlug.value = s
    localConfig.value = cloneEditionConfig(c)
    localJoinDescription.value = { ...d }
  },
)

watch(
  () => localConfig.value.colorPalette,
  (palette) => {
    if (palette) themeOverride.value = palette
  },
  { immediate: true },
)

const slugLocked = computed(() => props.status !== 'draft')

function onSave() {
  emit('save', {
    name: localName.value,
    slug: localSlug.value,
    config: localConfig.value,
    joinDescription: localJoinDescription.value,
  })
}

function openLogoPicker() {
  logoInputRef.value?.click()
}

function onLogoSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('uploadLogo', file)
  input.value = ''
}

function previewStyle(id: EditionColorPalette) {
  const [dawn, warm, light] = EDITION_COLOR_PALETTE_PREVIEW[id]
  return {
    background: `linear-gradient(180deg, ${dawn} 0%, ${warm} 45%, ${light} 100%)`,
  }
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
    <p v-if="shareUrl" class="admin-body text-xs break-all">
      Sharing link: {{ shareUrl }}
    </p>

    <p class="pixel-title text-xs pt-2">Landing page hero</p>
    <p class="admin-body text-xs opacity-80">
      Short description and optional logo on the edition landing, join, and rejoin pages.
    </p>
    <label class="admin-body text-xs block">Description (DE)</label>
    <textarea
      v-model="localJoinDescription.de"
      rows="3"
      maxlength="280"
      placeholder="Kurzbeschreibung für die Join-Seite"
      class="pixel-input w-full p-2 admin-body text-sm"
    />
    <label class="admin-body text-xs block">Description (EN)</label>
    <textarea
      v-model="localJoinDescription.en"
      rows="3"
      maxlength="280"
      placeholder="Short description for the join page"
      class="pixel-input w-full p-2 admin-body text-sm"
    />
    <div class="space-y-2">
      <p v-if="joinLogoUrl" class="admin-body text-xs break-all opacity-80">
        Current logo: {{ joinLogoUrl }}
      </p>
      <img
        v-if="joinLogoUrl"
        :src="joinLogoUrl"
        alt="Join page logo preview"
        class="w-14 h-14 border-4 border-[var(--pixel-forest-dark)]"
        style="image-rendering: pixelated"
      >
      <input
        ref="logoInputRef"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        class="sr-only"
        tabindex="-1"
        aria-hidden="true"
        @change="onLogoSelected"
      >
      <PixelButton variant="secondary" @click="openLogoPicker">Upload logo</PixelButton>
      <p class="admin-body text-xs opacity-70">PNG, JPEG, WebP, or SVG (max 2 MB). Falls back to default if empty.</p>
    </div>

    <p class="pixel-title text-xs pt-2">Color palette</p>
    <p class="admin-body text-xs opacity-80">
      Player, crew, and join pages for this edition use the selected color scheme.
    </p>
    <div
      class="grid grid-cols-2 gap-2 sm:grid-cols-3"
      role="radiogroup"
      aria-label="Edition color palette"
    >
      <button
        v-for="id in EDITION_COLOR_PALETTES"
        :key="id"
        type="button"
        role="radio"
        class="edition-palette-tile pixel-card flex flex-col gap-2 p-2 transition-transform"
        :class="{ 'edition-palette-tile--selected': localConfig.colorPalette === id }"
        :aria-checked="localConfig.colorPalette === id"
        @click="localConfig.colorPalette = id"
      >
        <span
          class="edition-palette-tile__swatch h-10 w-full border-2 border-[var(--pixel-forest-dark)]"
          :style="previewStyle(id)"
        />
        <span class="admin-body text-center text-[10px] leading-tight">
          {{ EDITION_COLOR_PALETTE_LABELS[id] }}
        </span>
      </button>
    </div>

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
      <label class="admin-body text-xs col-span-2">Client transcode (defaults: photo + video on)</label>
      <label class="admin-body text-xs flex items-center gap-2">
        <input v-model="localConfig.clientTranscode!.photo" type="checkbox">
        Photo compression
      </label>
      <label class="admin-body text-xs flex items-center gap-2">
        <input v-model="localConfig.clientTranscode!.video" type="checkbox">
        Video transcode
      </label>
      <label class="admin-body text-xs flex items-center gap-2">
        <input v-model="localConfig.clientTranscode!.audio" type="checkbox">
        Audio transcode
      </label>
    </div>

    <PixelButton variant="secondary" @click="onSave">Save edition settings</PixelButton>
  </div>
</template>

<style scoped>
.edition-palette-tile {
  border: 2px solid transparent;
  cursor: pointer;
}

.edition-palette-tile--selected {
  border-color: var(--pixel-sunrise);
  box-shadow:
    0 0 0 2px var(--pixel-sunrise),
    var(--pixel-shadow);
}

.edition-palette-tile__swatch {
  image-rendering: pixelated;
}
</style>
