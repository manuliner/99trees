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
  pendingApprovals: PendingApproval[]
}

const { data, refresh, error } = await useFetch<CrewTeamResponse>(`/api/crew/teams/${teamId}`, {
  credentials: 'include',
})

usePullToRefresh(async () => {
  await refresh()
})

const resolvingTurnId = ref<number | null>(null)
const showPwaInstall = ref(false)
const { maybeAutoShow: maybeShowPwaInstall } = usePwaInstall('crew')

watch(
  () => data.value?.team?.id,
  (id) => {
    if (id == null) return
    maybeShowPwaInstall(() => {
      showPwaInstall.value = true
    })
  },
  { immediate: true },
)

watch(error, (e) => {
  if (e?.statusCode === 401) {
    navigateTo(pathWithEdition('/crew/login'))
  }
})

const pendingApprovals = computed(
  () =>
    data.value?.pendingApprovals?.length
      ? data.value.pendingApprovals
      : data.value?.pendingApproval
        ? [data.value.pendingApproval]
        : [],
)

async function onResolve(actionId: string, item: PendingApproval) {
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
    <div class="flex items-start justify-between gap-2">
      <NuxtLink :to="pathWithEdition('/crew')" class="pixel-body text-sm underline">← Crew</NuxtLink>
      <PixelButton variant="secondary" @click="showPwaInstall = true">Install app</PixelButton>
    </div>
    <h1 class="pixel-title text-base">{{ data?.team.name }}</h1>
    <p class="pixel-body text-sm">Field {{ data?.team.positionConfirmed }}</p>

    <StaffApprovalCard
      v-for="item in pendingApprovals"
      :key="item.turnId"
      :item="item"
      :disabled="loading || resolvingTurnId === item.turnId"
      @resolve="(actionId) => onResolve(actionId, item)"
    />

    <PixelButton variant="secondary" @click="resetPin">Reset PIN</PixelButton>
    <p v-if="tempPin" class="pixel-body text-sm text-center">Temporary PIN: <strong>{{ tempPin }}</strong></p>

    <PwaInstallDialog
      :open="showPwaInstall"
      role="crew"
      @close="showPwaInstall = false"
    />
  </main>
</template>
