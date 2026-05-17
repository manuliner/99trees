<script setup lang="ts">
import type { BoardTeam } from '~/components/pixel/GameBoard.vue'
import type { FestivalMapPin } from '~/components/pixel/FestivalMap.vue'
import { joinPath } from '#shared/edition-urls'

const route = useRoute()
const { api } = useGameApi()
const { flash, show: showScore } = useScoreFeedback()
const { confirm: pixelConfirm } = usePixelConfirm()

const showScanner = ref(false)
const showTeamQr = ref(false)
const showLeaderboard = ref(false)
const showRules = ref(false)
const showConfirmBreakdown = ref(false)
const lastConfirmBreakdown = ref<{ scoreDelta: number } | null>(null)

const { data: me, refresh, error: meError } = await useFetch('/api/me', { credentials: 'include' })

watchEffect(() => {
  if (meError.value && 'statusCode' in meError.value && (meError.value as { statusCode: number }).statusCode === 401) {
    const slug = me.value?.edition?.slug
    navigateTo(slug ? joinPath(slug) : '/')
  }
})

type LeaderboardData = {
  teams: { id: number; name: string; position: number }[]
}

const leaderboardTeams = ref<BoardTeam[]>([])

async function refreshLeaderboard() {
  const editionId = me.value?.edition?.id
  if (editionId == null) return
  try {
    const data = await $fetch<LeaderboardData>(`/api/leaderboard?editionId=${editionId}`, {
      credentials: 'include',
    })
    leaderboardTeams.value = data.teams.map((t) => ({
      id: t.id,
      name: t.name,
      position: t.position,
    }))
  }
  catch {
    leaderboardTeams.value = []
  }
}

watch(
  () => me.value?.edition?.id,
  (id) => {
    if (id != null) refreshLeaderboard()
  },
  { immediate: true },
)

let boardPoll: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  boardPoll = setInterval(() => refreshLeaderboard(), 8_000)
})
onUnmounted(() => {
  if (boardPoll) clearInterval(boardPoll)
})

const loading = ref(false)
const scanSlug = ref('')
const scanToken = ref('')
const quizAnswer = ref('')
const actionError = ref('')

const turn = computed(() => me.value?.openTurn)
const team = computed(() => me.value?.team)
const edition = computed(() => me.value?.edition)

const mapPins = computed((): FestivalMapPin[] => me.value?.mapPins ?? [])

function toDiceNumber(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const lastDiceValue = ref<number | null>(null)
watch(
  () => turn.value?.diceValue,
  (v) => {
    const n = toDiceNumber(v)
    if (n != null) lastDiceValue.value = n
  },
  { immediate: true },
)

const diceFace = computed(() => {
  const fromTurn = toDiceNumber(turn.value?.diceValue)
  if (fromTurn != null) return fromTurn
  return lastDiceValue.value
})

const canRollNext = computed(
  () =>
    !team.value?.reachedGoal
    && edition.value?.status === 'live'
    && !turn.value,
)

const canReroll = computed(
  () =>
    turn.value?.state === 'rolled' && turn.value.canRollAgain
    || turn.value?.state === 'awaiting_crew',
)

const diceInteractive = computed(() => canRollNext.value || canReroll.value)

const canScanStation = computed(() => turn.value?.state === 'rolled')

const diceTooltip = computed(() => {
  if (canReroll.value) return 'Re-roll (0-round)'
  if (canRollNext.value) return 'Roll dice'
  if (diceFace.value != null) return `Last roll: ${diceFace.value}`
  return 'Roll dice'
})

async function onDiceClick() {
  if (canReroll.value) await abandonTurn()
  else if (canRollNext.value) await roll()
}

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
    const res = await api<{ dice: number }>('/api/turns/roll', { method: 'POST', body: {} })
    const rolled = toDiceNumber(res.dice)
    if (rolled != null) lastDiceValue.value = rolled
    await refresh()
    await refreshLeaderboard()
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
  if (mode === 'reveal_all') {
    const ok = await pixelConfirm({
      title: 'Reveal all hints',
      message: 'Reveal all hints now for −50 points?',
      confirmLabel: 'Reveal all',
      confirmVariant: 'danger',
    })
    if (!ok) return
  }
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
      { method: 'POST',
        body: { answer: quizAnswer.value } },
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
    await refreshLeaderboard()
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
  const ok = await pixelConfirm({
    title: 'Zero round',
    message: 'Zero round — no field progress and no points for this attempt. Continue?',
    confirmLabel: 'Continue',
    confirmVariant: 'danger',
  })
  if (!ok) return
  loading.value = true
  actionError.value = ''
  try {
    await api(`/api/turns/${turn.value!.id}/abandon`, { method: 'POST' })
    await refresh()
    await refreshLeaderboard()
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
  <main class="mx-auto flex max-w-md flex-col gap-4 p-4 pb-28">
    <PixelScoreFlash :delta="flash.delta" :visible="flash.visible" />

    <header class="flex flex-col gap-2">
      <div class="min-w-0">
        <h1 class="pixel-title truncate text-sm">{{ team?.name ?? '…' }}</h1>
        <p class="pixel-body text-xs opacity-80">Score: {{ team?.scoreTotal ?? 0 }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <PixelButton
          variant="highlight"
          class="!w-auto !min-h-0 !py-2 !px-3 !text-[10px]"
          @click="showLeaderboard = true"
        >
          Leaderboard
        </PixelButton>
        <PixelButton
          variant="highlight"
          class="!w-auto !min-h-0 !py-2 !px-3 !text-[10px]"
          @click="showRules = true"
        >
          Rules
        </PixelButton>
        <div class="ml-auto flex items-center gap-2">
          <PixelIconButton
            v-if="canScanStation"
            label="Scan station"
            variant="primary"
            :disabled="loading"
            @click="showScanner = true"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <path d="M5 9V5h4M19 9V5h-4M5 15v4h4M19 15v4h-4" stroke-linecap="square" />
              <path d="M9 12h6" stroke-linecap="square" />
            </svg>
          </PixelIconButton>
          <PixelIconButton
            label="Team QR"
            variant="secondary"
            @click="showTeamQr = true"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 3h1v1h-1v-1zm2-2h1v1h-1v-1zm-2 2h1v1h-1v-1z" />
            </svg>
          </PixelIconButton>
        </div>
      </div>
    </header>

    <ClientOnly>
      <PixelGameBoard
        v-if="edition"
        :field-count="edition.fieldCount"
        :position-confirmed="team?.positionConfirmed ?? 0"
        :position-pending="turn?.positionPending"
        :my-team-id="team?.id ?? null"
        :teams="leaderboardTeams"
        :show-dice="!team?.reachedGoal"
        :dice-value="diceFace"
        :dice-tooltip="diceTooltip"
        :dice-interactive="diceInteractive"
        :dice-loading="loading"
        @dice-click="onDiceClick"
      />
      <template #fallback>
        <div class="pixel-card min-h-[12rem] p-3" aria-hidden="true" />
      </template>
    </ClientOnly>

    <section v-if="edition" class="pixel-card space-y-2 p-3">
      <p class="pixel-title text-xs text-center">Festival map</p>
      <PixelFestivalMap
        :map-image-url="edition.mapImageUrl ?? null"
        :pins="mapPins"
      />
    </section>

    <p v-if="actionError" class="text-center text-sm text-[var(--pixel-score-minus)]">{{ actionError }}</p>

    <div class="play-actions space-y-4">
      <section v-if="team?.reachedGoal" class="pixel-card p-4 text-center">
        <p class="pixel-title text-xs">You reached the goal!</p>
      </section>

      <section v-else-if="!turn && edition?.status !== 'live'" class="pixel-card p-4">
        <p class="text-center text-xs opacity-70">Game status: {{ edition?.status }}</p>
      </section>

      <section v-else-if="turn && turn.state === 'rolled'" class="space-y-4">
        <div class="pixel-card p-4 text-center">
          <p class="pixel-body text-sm">
            Seeking field <strong>{{ turn.positionPending }}</strong> of {{ edition?.fieldCount }}
          </p>
          <p class="pixel-body mt-2 text-sm">{{ turn.station?.hintVague }}</p>
        </div>

        <div class="pixel-card space-y-3 p-4">
          <p class="pixel-title text-xs">Hints</p>
          <p v-if="hintVisible(1)" class="pixel-body text-sm">{{ turn.station?.hintLevel1 }}</p>
          <p v-if="hintVisible(2)" class="pixel-body text-sm">{{ turn.station?.hintLevel2 }}</p>
          <p v-if="hintVisible(3)" class="pixel-body text-xs opacity-80">
            Map hint unlocked — see the festival map above.
          </p>
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

      </section>

      <section v-else-if="turn && turn.state === 'scanned'" class="pixel-card space-y-4 p-4">
        <p class="pixel-title text-xs">Quiz</p>
        <p class="pixel-body text-sm">{{ quizQuestion }}</p>
        <input v-model="quizAnswer" class="pixel-input w-full p-3">
        <PixelButton :disabled="loading" @click="submitAnswer">Submit answer</PixelButton>
      </section>

      <section v-else-if="turn && turn.state === 'awaiting_crew'" class="pixel-card space-y-4 p-4 text-center">
        <p class="pixel-title text-xs">Performance</p>
        <p class="pixel-body text-sm">{{ performanceText }}</p>
        <p class="pixel-body text-sm opacity-80">Waiting for crew…</p>
      </section>

      <section v-else-if="turn && turn.state === 'completed'" class="pixel-card space-y-4 p-4">
        <p class="pixel-body text-center text-sm">Task complete — secure your position and points.</p>
        <PixelButton :disabled="loading" @click="confirmTurn">Confirm turn</PixelButton>
      </section>
    </div>

    <PixelDialog :open="showRules" title="Game rules" scrollable @close="showRules = false">
      <GameRulesContent />
    </PixelDialog>

    <PixelDialog :open="showLeaderboard" title="Leaderboard" scrollable @close="showLeaderboard = false">
      <LeaderboardPanel
        v-if="edition"
        :edition-id="edition.id"
        :active="showLeaderboard"
      />
    </PixelDialog>

    <PixelDialog
      :open="showScanner"
      title="Scan station"
      panel-class="!p-3"
      @close="showScanner = false"
    >
      <StationQrScanner
        v-if="showScanner"
        embedded
        @scanned="onQrScanned"
        @close="showScanner = false"
      />
    </PixelDialog>

    <PixelDialog :open="showTeamQr" title="Our Team QR" @close="showTeamQr = false">
      <p class="pixel-body text-center text-sm">{{ team?.name }}</p>
      <img
        v-if="teamQrUrl"
        :src="`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(teamQrUrl)}`"
        alt="Team QR"
        class="mx-auto border-4 border-[var(--pixel-forest-dark)]"
        width="220"
        height="220"
      >
      <p class="pixel-body break-all text-center text-xs opacity-80">{{ teamQrUrl }}</p>
    </PixelDialog>

    <PixelDialog :open="showConfirmBreakdown" title="Turn complete" @close="showConfirmBreakdown = false">
      <p v-if="lastConfirmBreakdown" class="pixel-title text-center text-sm text-[var(--pixel-score-plus)]">
        +{{ lastConfirmBreakdown.scoreDelta }} points this turn
      </p>
      <PixelButton @click="showConfirmBreakdown = false">Continue</PixelButton>
    </PixelDialog>
  </main>
</template>

<style scoped>
.play-actions {
  position: sticky;
  bottom: 0.75rem;
  z-index: 10;
}
</style>
