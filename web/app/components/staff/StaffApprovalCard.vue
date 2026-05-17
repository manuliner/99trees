<script setup lang="ts">
import type { PendingApproval } from '#shared/types'
import { formatWaitTime } from '~/utils/format-wait-time'

const props = withDefaults(
  defineProps<{
    item: PendingApproval
    readOnly?: boolean
    disabled?: boolean
    bodyClass?: string
  }>(),
  { readOnly: false, disabled: false, bodyClass: 'pixel-body' },
)

const emit = defineEmits<{
  resolve: [actionId: string]
}>()

const kindLabel = computed(() => {
  if (props.item.kind === 'performance') return 'Performance'
  return props.item.kind
})

const metaLine = computed(() => {
  const parts = [props.item.teamName]
  if (props.item.fieldNumber != null) parts.push(`Field ${props.item.fieldNumber}`)
  if (props.item.stationSlug) parts.push(props.item.stationSlug)
  return parts.join(' · ')
})

const waitLabel = computed(() => formatWaitTime(props.item.waitingSince))
</script>

<template>
  <article class="pixel-card p-3 space-y-2">
    <div class="flex items-start justify-between gap-2">
      <span
        class="shrink-0 px-1.5 py-0.5 text-[10px] uppercase border-2 border-[var(--pixel-forest-dark)] bg-[var(--pixel-sunrise)]"
        :class="bodyClass"
      >
        {{ kindLabel }}
      </span>
      <span v-if="waitLabel" class="text-[10px] opacity-70 shrink-0" :class="bodyClass">
        {{ waitLabel }}
      </span>
    </div>

    <p class="text-sm font-medium" :class="bodyClass">{{ metaLine }}</p>

    <p v-if="item.summary" class="text-sm line-clamp-3 opacity-90" :class="bodyClass">
      {{ item.summary }}
    </p>

    <div v-if="!readOnly && item.actions.length" class="space-y-2">
      <PixelButton
        v-for="action in item.actions"
        :key="action.id"
        :variant="action.variant ?? 'primary'"
        :disabled="disabled"
        @click="emit('resolve', action.id)"
      >
        {{ action.label }}
      </PixelButton>
    </div>
    <p v-else-if="readOnly" class="text-xs opacity-70" :class="bodyClass">
      Approval disabled for ended editions.
    </p>
  </article>
</template>
