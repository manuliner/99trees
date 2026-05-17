<script setup lang="ts">
import type { EditionStatus } from '#shared/types'
import type { AdminChecklist } from '~/composables/useAdminEdition'
import { editionPath } from '#shared/edition-urls'

const props = withDefaults(
  defineProps<{
    status: EditionStatus
    slug: string
    canGoLive: boolean
    checklist: AdminChecklist | null
    compact?: boolean
  }>(),
  { compact: false },
)

const emit = defineEmits<{ setStatus: [status: EditionStatus] }>()

const statusHelp: Record<EditionStatus, string> = {
  draft: 'Teams cannot register. Leaderboard hidden.',
  live: 'Registration and play are open. Leaderboard is public.',
  paused: 'No new teams or rolls. Leaderboard frozen.',
  ended: 'Game finished. Final standings fixed.',
}

const leaderboardPath = computed(() => editionPath(props.slug, '/leaderboard'))
</script>

<template>
  <div :class="compact ? 'admin-edition-control--compact' : 'space-y-2'">
    <p v-if="!compact" class="admin-body text-sm">{{ statusHelp[status] }}</p>
    <ul
      v-if="!compact && status === 'draft' && checklist && !checklist.ok"
      class="admin-body text-xs list-disc pl-5 text-[var(--pixel-score-minus)]"
    >
      <li v-for="issue in checklist.issues" :key="issue">{{ issue }}</li>
    </ul>
    <div
      class="flex gap-2"
      :class="compact ? 'admin-edition-control__actions--compact' : 'flex-wrap'"
    >
      <PixelButton
        v-if="status === 'draft' || status === 'paused'"
        :disabled="status === 'draft' && !canGoLive"
        :title="status === 'draft' && !canGoLive ? 'Fix checklist issues first' : undefined"
        @click="emit('setStatus', 'live')"
      >
        Go live
      </PixelButton>
      <PixelButton
        v-if="status === 'live'"
        variant="secondary"
        @click="emit('setStatus', 'paused')"
      >
        Pause
      </PixelButton>
      <PixelButton
        v-if="status === 'live' || status === 'paused'"
        variant="danger"
        @click="emit('setStatus', 'ended')"
      >
        End game
      </PixelButton>
    </div>
    <NuxtLink
      v-if="!compact && (status === 'live' || status === 'paused' || status === 'ended')"
      :to="leaderboardPath"
      class="admin-body text-sm underline block text-center opacity-80"
    >
      View leaderboard
    </NuxtLink>
  </div>
</template>

<style scoped>
.admin-edition-control--compact {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  min-width: 0;
}

.admin-edition-control__actions--compact {
  flex-wrap: nowrap;
  gap: 0.375rem;
  justify-content: flex-end;
  min-width: 0;
}

.admin-edition-control__actions--compact :deep(.pixel-btn) {
  flex: 0 1 auto;
  width: auto;
  min-width: 0;
  min-height: 1.75rem;
  padding: 0.25rem 0.5rem;
  font-size: 7px;
  line-height: 1.2;
  box-shadow: 2px 2px 0 var(--pixel-forest-dark);
}
</style>
