<script setup lang="ts">
const route = useRoute()
const { api } = useGameApi()
const { flash, show: showScore } = useScoreFeedback()

const showScanner = ref(false)
const showTeamQr = ref(false)
const showConfirmBreakdown = ref(false)
const lastConfirmBreakdown = ref<{ scoreDelta: number } | null>(null)

const { data: me, refresh, error: meError } = await useFetch('/api/me', { credentials: 'include' })

watchEffect(() => {
  if (meError.value && 'statusCode' in meError.value && (meError.value as { statusCode: number }).statusCode === 401) {
    navigateTo('/join')
  }
})

const loading = ref(false)
const scanSlug = ref('')
const scanToken = ref('')
const quizAnswer = ref('')
const actionError = ref('')

const turn = computed(() => me.value?.openTurn)
const team = computed(() => me.value?.team)
const edition = computed(() => me.value?.edition)

const quizQuestion = computed(() => {
  const payload = (turn.value?.station as { taskPayload?: { question?: string } } | null)?.taskPayload
  return payload?.question ?? ''
})

const performanceText = computed(() => {
  const payload = (turn.value?.station as { taskPayload?: { text?: string } } | null)?.taskPayload
  return payload?.text ?? ''
})

const teamQrUrl = computed(() => {
  if (!team.value?.teamQrPath) return ''
  if (import.meta.client) return `${window.location.origin}${team.value.teamQrPath}`
  return team.value.teamQrPath
})

const now = ref(Date.now())
onMounted(() => {
  const id = setInterval(() => { now.value = Date.now() }, 1000)
  onUnmounted(() => clearInterval(id))

  const slug = route.query.slug as string | undefined
  const token = route.query.t as string | undefined
  if (slug && token) {
    scanSlug.value = slug
    scanToken.value = token
    nextTick(() => {
      if (turn.value?.state === 'rolled') scanStation()
    })
  }
})

function hintUnlocked(level: number) {
  const unlock = turn.value?.hintUnlockAt?.[level - 1]
  if (!unlock) return false
  return turn.value?.hintMode === 'reveal_all' || now.value >= unlock
}

function hintVisible(level: number) {
  return turn.value?.hintsUsed?.includes(level) || turn.value?.hintMode === 'reveal_all'
}

function formatCountdown(ms: number) {
  const s = Math.max(0, Math.ceil((ms - now.value) / 1000))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

async function roll() {
  loading.value = true
  actionError.value = ''
  try {
    await api('/api/turns/roll', { method: 'POST', body: {} })
    await refresh()
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    actionError.value = err.data?.statusMessage ?? 'Could not roll'
  }
  finally {
    loading.value = false
  }
}

async function useHint(level?: number, mode?: 'reveal_all') {
  if (mode === 'reveal_all' && !confirm('Reveal all hints now for −50 points?')) return
  loading.value = true
  actionError.value = ''
  try {
    const res = await api<{ pointCostPreview: number }>(`/api/turns/${turn.value!.id}/hint`, {
      method: 'POST',
      body: mode ? { mode } : { level },
    })
    if (res.pointCostPreview) showScore(-res.pointCostPreview)
    await refresh()
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    actionError.value = err.data?.statusMessage ?? 'Hint failed'
  }
  finally {
    loading.value = false
  }
}

async function scanStation() {
  loading.value = true
  actionError.value = ''
  try {
    await api(`/api/turns/${turn.value!.id}/scan`, {
      method: 'POST',
      body: { stationSlug: scanSlug.value, token: scanToken.value },
    })
    showScanner.value = false
    await refresh()
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    actionError.value = err.data?.statusMessage ?? 'Scan failed'
  }
  finally {
    loading.value = false
  }
}

function onQrScanned(payload: { slug: string; token: string }) {
  scanSlug.value = payload.slug
  scanToken.value = payload.token
  scanStation()
}

async function submitAnswer() {
  loading.value = true
  actionError.value = ''
  try {
    const res = await api<{ correct: boolean; penaltyPoints?: number }>(
      `/api/turns/${turn.value!.id}/answer`,
      { method: 'POST', body: { answer: quizAnswer.value } },
    )
    if (!res.correct) showScore(-(res.penaltyPoints ?? 5))
    await refresh()
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    actionError.value = err.data?.statusMessage ?? 'Answer failed'
  }
  finally {
    loading.value = false
  }
}

async function confirmTurn() {
  loading.value = true
  actionError.value = ''
  try {
    const res = await api<{ scoreDelta: number }>(`/api/turns/${turn.value!.id}/confirm`, { method: 'POST' })
    showScore(res.scoreDelta)
    lastConfirmBreakdown.value = res
    showConfirmBreakdown.value = true
    await refresh()
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    actionError.value = err.data?.statusMessage ?? 'Confirm failed'
  }
  finally {
    loading.value = false
  }
}

async function abandonTurn() {
  if (!confirm('Zero round — no field progress and no points for this attempt. Continue?')) return
  loading.value = true
  actionError.value = ''
  try {
    await api(`/api/turns/${turn.value!.id}/abandon`, { method: 'POST' })
    await refresh()
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    actionError.value = err.data?.statusMessage ?? 'Abandon failed'
  }
  finally {
    loading.value = false
  }
}

let pollTimer: ReturnType<typeof setInterval> | null = null
watch(
  () => turn.value?.state,
  (state) => {
    if (pollTimer) clearInterval(pollTimer)
    if (state === 'awaiting_crew') {
      pollTimer = setInterval(() => refresh(), 3000)
    }
  },
  { immediate: true },
)
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <main class="p-4 max-w-md mx-auto space-y-4 pb-24">
    <ScoreFlash :delta="flash.delta" :visible="flash.visible" />

    <header class="flex justify-between items-start gap-2">
      <div>
        <h1 class="pixel-title text-sm">{{ team?.name ?? '…' }}</h1>
        <p class="pixel-body text-xs opacity-80">Score: {{ team?.scoreTotal ?? 0 }}</p>
      </div>
      <PixelButton variant="secondary" class="!w-auto !min-h-0 !py-2 !px-3 !text-[10px]" @click="showTeamQr = true">
        Team QR
      </PixelButton>
    </header>

    <BirdBoard
      v-if="edition"
      :field-count="edition.fieldCount"
      :position-confirmed="team?.positionConfirmed ?? 0"
      :position-pending="turn?.positionPending"
    />

    <nav class="flex gap-4 justify-center text-sm">
      <NuxtLink :to="`/leaderboard?edition=${edition?.id ?? 1}`" class="pixel-body underline">Leaderboard</NuxtLink>
      <NuxtLink to="/rules" class="pixel-body underline">Rules</NuxtLink>
    </nav>

    <p v-if="actionError" class="text-sm text-[var(--pixel-score-minus)] text-center">{{ actionError }}</p>

    <section v-if="team?.reachedGoal" class="pixel-card p-4 text-center">
      <p class="pixel-title text-xs">You reached the end of the migration!</p>
    </section>

    <section v-else-if="!turn" class="pixel-card p-4 space-y-4">
      <PixelButton :disabled="loading || edition?.status !== 'live'" @click="roll">ROLL DICE</PixelButton>
      <p v-if="edition?.status !== 'live'" class="text-xs text-center opacity-70">Game status: {{ edition?.status }}</p>
    </section>

    <section v-else-if="turn.state === 'rolled'" class="space-y-4">
      <div class="pixel-card p-4 text-center">
        <p class="pixel-body text-sm">Dice: <strong>{{ turn.diceValue }}</strong></p>
        <p class="pixel-body text-sm mt-2">Seeking field <strong>{{ turn.positionPending }}</strong> of {{ edition?.fieldCount }}</p>
        <p class="pixel-body text-sm mt-2">{{ turn.station?.hintVague }}</p>
      </div>

      <div class="pixel-card p-4 space-y-3">
        <p class="pixel-title text-xs">Hints</p>
        <p v-if="hintVisible(1)" class="pixel-body text-sm">{{ turn.station?.hintLevel1 }}</p>
        <p v-if="hintVisible(2)" class="pixel-body text-sm">{{ turn.station?.hintLevel2 }}</p>
        <FestivalMap
          v-if="hintVisible(3) && turn.station"
          :map-image-url="edition?.mapImageUrl ?? null"
          :map-x="turn.station.mapX"
          :map-y="turn.station.mapY"
          :field-number="turn.station.fieldNumber"
        />
        <p v-if="!hintUnlocked(1)" class="pixel-body text-xs opacity-70">
          Hint 1 in {{ formatCountdown(turn.hintUnlockAt![0]!) }}
        </p>
        <p v-else-if="hintUnlocked(1) && !hintUnlocked(2)" class="pixel-body text-xs opacity-70">
          Hint 2 in {{ formatCountdown(turn.hintUnlockAt![1]!) }}
        </p>
        <p v-else-if="hintUnlocked(2) && !hintUnlocked(3)" class="pixel-body text-xs opacity-70">
          Hint 3 (map) in {{ formatCountdown(turn.hintUnlockAt![2]!) }}
        </p>
        <PixelButton v-if="!hintVisible(1) && hintUnlocked(1)" variant="secondary" :disabled="loading" @click="useHint(1)">
          Hint 1 (−10 points)
        </PixelButton>
        <PixelButton v-if="!hintVisible(2) && hintUnlocked(2)" variant="secondary" :disabled="loading" @click="useHint(2)">
          Hint 2 (−12 points)
        </PixelButton>
        <PixelButton
          v-if="!hintVisible(3) && hintUnlocked(3) && edition?.mapImageUrl"
          variant="secondary"
          :disabled="loading"
          @click="useHint(3)"
        >
          Map hint (−15 points)
        </PixelButton>
        <p v-else-if="!hintVisible(3) && hintUnlocked(3) && !edition?.mapImageUrl" class="pixel-body text-xs opacity-70">
          Map hint unavailable — festival map not uploaded
        </p>
        <PixelButton
          v-if="turn.canRevealAll && turn.hintMode !== 'reveal_all'"
          variant="secondary"
          :disabled="loading"
          @click="useHint(undefined, 'reveal_all')"
        >
          REVEAL ALL HINTS (−50 points)
        </PixelButton>
      </div>

      <PixelButton :disabled="loading" @click="showScanner = true">SCAN STATION</PixelButton>

      <PixelButton v-if="turn.canRollAgain" variant="danger" :disabled="loading" @click="abandonTurn">
        ROLL AGAIN (0-round)
      </PixelButton>
    </section>

    <section v-else-if="turn.state === 'scanned'" class="pixel-card p-4 space-y-4">
      <p class="pixel-title text-xs">Quiz</p>
      <p class="pixel-body text-sm">{{ quizQuestion }}</p>
      <input v-model="quizAnswer" class="w-full p-3 border-4 border-[var(--pixel-forest-dark)] bg-white" />
      <PixelButton :disabled="loading" @click="submitAnswer">Submit answer</PixelButton>
    </section>

    <section v-else-if="turn.state === 'awaiting_crew'" class="pixel-card p-4 space-y-4 text-center">
      <p class="pixel-title text-xs">Performance</p>
      <p class="pixel-body text-sm">{{ performanceText }}</p>
      <p class="pixel-body text-sm opacity-80">Waiting for crew…</p>
      <PixelButton variant="secondary" @click="showTeamQr = true">Show our Team QR</PixelButton>
      <PixelButton variant="danger" :disabled="loading" @click="abandonTurn">ROLL AGAIN (0-round)</PixelButton>
    </section>

    <section v-else-if="turn.state === 'completed'" class="pixel-card p-4 space-y-4">
      <p class="pixel-body text-sm text-center">Task complete — secure your position and points.</p>
      <PixelButton :disabled="loading" @click="confirmTurn">Confirm turn</PixelButton>
    </section>

    <StationQrScanner v-if="showScanner" @scanned="onQrScanned" @close="showScanner = false" />

    <PixelDialog :open="showTeamQr" title="Our Team QR" @close="showTeamQr = false">
      <p class="pixel-body text-sm text-center">{{ team?.name }}</p>
      <img
        v-if="teamQrUrl"
        :src="`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(teamQrUrl)}`"
        alt="Team QR"
        class="mx-auto border-4 border-[var(--pixel-forest-dark)]"
        width="220"
        height="220"
      >
      <p class="pixel-body text-xs break-all text-center opacity-80">{{ teamQrUrl }}</p>
    </PixelDialog>

    <PixelDialog :open="showConfirmBreakdown" title="Turn complete" @close="showConfirmBreakdown = false">
      <p v-if="lastConfirmBreakdown" class="pixel-title text-sm text-center text-[var(--pixel-score-plus)]">
        +{{ lastConfirmBreakdown.scoreDelta }} points this turn
      </p>
      <PixelButton @click="showConfirmBreakdown = false">Continue</PixelButton>
    </PixelDialog>
  </main>
</template>
