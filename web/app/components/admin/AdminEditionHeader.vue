<script setup lang="ts">
import type { AdminEdition } from '~/composables/useAdminEdition'

const props = defineProps<{
  editions: AdminEdition[]
  selectedId: number | null
  showNewEdition: boolean
  showGameControl?: boolean
  approvalCount?: number
}>()

function scrollToTeams() {
  document.getElementById('teams-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const emit = defineEmits<{
  'update:selectedId': [id: number]
  'update:showNewEdition': [open: boolean]
  create: [payload: { name: string; slug: string }]
}>()

const newName = ref('')
const newSlug = ref('')

function statusClass(status: string) {
  if (status === 'live') return 'bg-[var(--pixel-score-plus)]'
  if (status === 'paused') return 'bg-[var(--pixel-sunrise)]'
  if (status === 'ended') return 'bg-[var(--pixel-score-minus)]'
  return 'bg-[var(--pixel-forest-mid)]'
}

function onCreate() {
  emit('create', { name: newName.value, slug: newSlug.value })
  newName.value = ''
  newSlug.value = ''
}

function toggleNewEdition() {
  emit('update:showNewEdition', !props.showNewEdition)
}
</script>

<template>
  <header class="pixel-card p-4 space-y-3 sticky top-0 z-10">
    <div class="flex items-start justify-between gap-2">
      <h1 class="pixel-title text-base">Admin</h1>
      <slot name="actions" />
    </div>

    <div class="space-y-1">
      <label v-if="editions.length" class="admin-body text-sm block">Edition</label>
      <div class="flex gap-2 items-stretch">
        <select
          v-if="editions.length"
          :value="selectedId ?? ''"
          class="pixel-select flex-1 min-w-0 p-2 admin-body"
          @change="emit('update:selectedId', Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="e in editions" :key="e.id" :value="e.id">
            {{ e.name }} ({{ e.slug }}) — {{ e.status }}
          </option>
        </select>
        <PixelIconButton
          :label="showNewEdition ? 'Cancel new edition' : 'New edition'"
          variant="secondary"
          class="admin-edition-header__new-btn shrink-0"
          @click="toggleNewEdition"
        >
          <svg
            v-if="showNewEdition"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" stroke-linecap="square" />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" stroke-linecap="square" />
          </svg>
        </PixelIconButton>
      </div>
    </div>

    <div
      v-if="editions.length"
      class="admin-edition-header__status-row"
    >
      <template
        v-for="e in editions.filter((x) => x.id === selectedId)"
        :key="e.id"
      >
        <span
          class="admin-edition-header__badge px-2 py-0.5 text-[10px] uppercase text-white border-2 border-[var(--pixel-forest-dark)] shrink-0"
          :class="statusClass(e.status)"
        >
          {{ e.status }}
        </span>
        <span class="admin-body text-xs opacity-80 shrink-0 whitespace-nowrap">
          {{ e.fieldCount }} fields · {{ e.teamCount }} teams
        </span>
        <button
          v-if="approvalCount != null && approvalCount > 0"
          type="button"
          class="admin-edition-header__waiting shrink-0 px-2 py-0.5 text-[10px] uppercase border-2 border-[var(--pixel-forest-dark)] bg-[var(--pixel-sunrise)] admin-body"
          @click="scrollToTeams"
        >
          {{ approvalCount }} waiting
        </button>
      </template>
      <div v-if="showGameControl" class="admin-edition-header__controls">
        <slot name="game-control" />
      </div>
    </div>

    <div v-if="showNewEdition" class="space-y-2 pt-2 border-t-2 border-[var(--pixel-forest-dark)]">
      <input v-model="newName" placeholder="Edition name" class="pixel-input w-full p-2 admin-body">
      <input
        v-model="newSlug"
        placeholder="URL slug (optional, e.g. zv26)"
        class="pixel-input w-full p-2 admin-body"
      >
      <PixelButton variant="secondary" @click="onCreate">Create draft</PixelButton>
    </div>
  </header>
</template>

<style scoped>
.admin-edition-header__new-btn :deep(.pixel-icon-btn__btn) {
  width: 2.25rem;
  height: 2.25rem;
}

.admin-edition-header__status-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.5rem;
}

.admin-edition-header__controls {
  flex: 1 1 8rem;
  min-width: 0;
  display: flex;
  justify-content: flex-end;
}
</style>
