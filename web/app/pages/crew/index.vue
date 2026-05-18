<script setup lang="ts">
import type { PendingApproval } from '#shared/types'

definePageMeta({ layout: 'crew', ssr: false })

const { editionId, editionError, pathWithEdition } = useEditionId({
  source: 'crew',
  required: false,
})
const { api } = useGameApi()
const search = ref('')
const results = ref<{ id: number; name: string }[]>([])
const showTeamScanner = ref(false)
const showCrewMenu = ref(false)
const showPwaInstall = ref(false)
const scanError = ref('')
const { maybeAutoShow: maybeShowPwaInstall } = usePwaInstall('crew')

const {
  pending,
  resolvingTurnId,
  rate,
  loadPending,
} = useStaffApprovals(editionId, { poll: true })

usePullToRefresh(loadPending)

usePullToRefreshDisabled(computed(() => showTeamScanner.value || showCrewMenu.value || showPwaInstall.value))

watch(editionId, (id) => {
  if (id == null) return
  maybeShowPwaInstall(() => {
    showPwaInstall.value = true
  })
}, { immediate: true })

watch(search, async (q) => {
  if (editionId.value == null) return
  if (q.length < 2) {
    results.value = []
    return
  }
  const res = await api<{ teams: typeof results.value }>(
    `/api/crew/teams/search?q=${encodeURIComponent(q)}`,
    { credentials: 'include' },
  )
  results.value = res.teams
})

function crewTeamPath(teamId: number) {
  return pathWithEdition(`/crew/teams/${teamId}`)
}

async function onResolve(item: PendingApproval, actionId: string) {
  await rate(item, actionId)
}

async function onTeamQrScanned(payload: { slug: string; token: string }) {
  showTeamScanner.value = false
  scanError.value = ''
  try {
    const res = await api<{ teamId: number }>(
      `/api/crew/teams/resolve?slug=${encodeURIComponent(payload.slug)}&t=${encodeURIComponent(payload.token)}`,
      { credentials: 'include' },
    )
    await navigateTo(crewTeamPath(res.teamId))
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    scanError.value = err.data?.statusMessage ?? 'Invalid team QR'
  }
}

async function logout() {
  await api('/api/crew/logout', { method: 'POST', credentials: 'include' })
  await navigateTo(pathWithEdition('/crew/login'))
}
</script>

<template>
  <main v-if="editionError" class="p-4 max-w-md mx-auto space-y-4 text-center">
    <p class="pixel-card p-4 pixel-body text-sm">{{ editionError }}</p>
    <NuxtLink to="/" class="pixel-body text-sm underline">Festival overview</NuxtLink>
  </main>
  <main v-else-if="editionId != null" class="p-4 max-w-md mx-auto space-y-4">
    <div class="flex items-center justify-between gap-2">
      <h1 class="pixel-title text-base">Crew</h1>
      <PixelButton variant="secondary" @click="showCrewMenu = true">Menu</PixelButton>
    </div>

    <PixelButton variant="secondary" @click="showTeamScanner = true">Scan Team QR</PixelButton>
    <p v-if="scanError" class="text-sm text-[var(--pixel-score-minus)] text-center">{{ scanError }}</p>

    <StaffApprovalList
      :items="pending"
      :resolving-turn-id="resolvingTurnId"
      @resolve="onResolve"
    />

    <div class="pixel-card p-4 space-y-3">
      <p class="pixel-title text-xs">Find team</p>
      <input
        v-model="search"
        placeholder="Team name…"
        class="pixel-input w-full p-3"
      >
      <NuxtLink
        v-for="t in results"
        :key="t.id"
        :to="crewTeamPath(t.id)"
        class="block pixel-body text-sm py-2 border-t border-[var(--pixel-forest-dark)]/20"
      >
        {{ t.name }}
      </NuxtLink>
    </div>

    <PixelDialog :open="showCrewMenu" title="Menu" @close="showCrewMenu = false">
      <div class="space-y-2">
        <PixelButton
          variant="secondary"
          @click="showCrewMenu = false; showPwaInstall = true"
        >
          Install app
        </PixelButton>
        <PixelButton variant="secondary" @click="showCrewMenu = false; logout()">
          Log out
        </PixelButton>
      </div>
    </PixelDialog>

    <PwaInstallDialog
      :open="showPwaInstall"
      role="crew"
      @close="showPwaInstall = false"
    />

    <TaskQrScanner
      v-if="showTeamScanner"
      mode="team"
      @scanned="onTeamQrScanned"
      @close="showTeamScanner = false"
    />
  </main>
</template>
