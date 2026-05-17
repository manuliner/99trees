<script setup lang="ts">
import type { PendingApproval } from '#shared/types'

const props = withDefaults(
  defineProps<{
    items: PendingApproval[]
    readOnly?: boolean
    resolvingTurnId?: number | null
    title?: string
    bodyClass?: string
  }>(),
  {
    readOnly: false,
    resolvingTurnId: null,
    title: 'Needs approval',
    bodyClass: 'pixel-body',
  },
)

const emit = defineEmits<{
  resolve: [item: PendingApproval, actionId: string]
}>()
</script>

<template>
  <section v-if="items.length" class="space-y-2">
    <p class="pixel-title text-xs" :class="bodyClass">
      {{ title }} ({{ items.length }})
    </p>
    <StaffApprovalCard
      v-for="item in items"
      :key="item.turnId"
      :item="item"
      :read-only="readOnly"
      :disabled="resolvingTurnId === item.turnId"
      :body-class="bodyClass"
      @resolve="emit('resolve', item, $event)"
    />
  </section>
</template>
