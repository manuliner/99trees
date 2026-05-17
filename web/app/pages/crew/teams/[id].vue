<script setup lang="ts">
import type { PendingApproval } from '#shared/types'
import { actionIdToRating } from '~/composables/useStaffApprovals'

definePageMeta({ layout: 'crew', ssr: false })

const route = useRoute()
const teamId = Number(route.params.id)
const { pathWithEdition } = useEditionId({ source: 'crew', required: false })
const { api } = useGameApi()
const { confirm: pixelConfirm } = usePixelConfirm()
const loading = ref(false)
const tempPin = ref<string | null>(null)

type CrewTeamResponse = {
  team: { id: number; name: string; positionConfirmed: number }
  currentTurn: { id: number; state: string } | null
  pendingApproval: PendingApproval | null
}

const { data, refresh, error } = await useFetch<CrewTeamResponse>(`/api/crew/teams/${teamId}`, {
  credentials: 'include',
})

usePullToRefresh(async () => {
  await refresh()
})

const resolvingTurnId = ref<number | null>(null)

watch(error, (e) => {
  if (e?.statusCode === 401) {
    navigateTo(pathWithEdition('/crew/login'))
  }
})

async function onResolve(actionId: string) {
  const item = data.value?.pendingApproval
  if (!item) return
  const rating = actionIdToRating(item.kind, actionId)
  if (!rating) return
  loading.value = true
  resolvingTurnId.value = item.turnId
  try {
    await api('/api/crew/rate', {
      method: 'POST',
      body: { teamId: item.teamId, turnId: item.turnId, rating },
      credentials: 'include',
    })
    await refresh()
  }
  finally {
    loading.value = false
    resolvingTurnId.value = null
  }
}

async function resetPin() {
  const ok = await pixelConfirm({
    title: 'Reset PIN',
    message: 'Reset PIN for this team?',
    confirmLabel: 'Reset PIN',
    confirmVariant: 'danger',
  })
  if (!ok) return
  loading.value = true
  try {
    const res = await api<{ tempPin: string }>(`/api/crew/teams/${teamId}/reset-pin`, { method: 'POST' })
    tempPin.value = res.tempPin
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="p-4 max-w-md mx-auto space-y-4">
    <NuxtLink :to="pathWithEdition('/crew')" class="pixel-body text-sm underline">← Crew</NuxtLink>
    <h1 class="pixel-title text-base">{{ data?.team.name }}</h1>
    <p class="pixel-body text-sm">Field {{ data?.team.positionConfirmed }}</p>

    <StaffApprovalCard
      v-if="data?.pendingApproval"
      :item="data.pendingApproval"
      :disabled="loading || resolvingTurnId === data.pendingApproval.turnId"
      @resolve="onResolve"
    />

    <PixelButton variant="secondary" @click="resetPin">Reset PIN</PixelButton>
    <p v-if="tempPin" class="pixel-body text-sm text-center">Temporary PIN: <strong>{{ tempPin }}</strong></p>
  </main>
</template>
