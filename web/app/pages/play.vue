<script setup lang="ts">
import type { BoardTeam } from '~/components/pixel/GameBoard.vue'
import type { FestivalMapPin } from '~/components/pixel/FestivalMap.vue'
import { joinPath } from '#shared/edition-urls'
import { pickRollDicePrompt } from '~/utils/roll-dice-prompts'

/** Team session, board layout, dialogs, and QR — client-only to avoid SSR/HMR drift in dev. */
definePageMeta({ ssr: false })

const route = useRoute()
const { api } = useGameApi()
const { flash, show: showScore } = useScoreFeedback()
const { confirm: pixelConfirm } = usePixelConfirm()

const showScanner = ref(false)
const showTeamQr = ref(false)
const showLeaderboard = ref(false)
const showRules = ref(false)
const showConfirmBreakdown = ref(false)
const showFestivalMapFullscreen = ref(false)
const lastConfirmBreakdown = ref<{ scoreDelta: number } | null>(null)

const { data: me, refresh, error: meError } = await useFetch('/api/me', {
  credentials: 'include',
  server: false,
})

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

usePullToRefresh(async () => {
  await refreshLeaderboard()
})

usePullToRefreshDisabled(
  computed(
    () =>
      showScanner.value
      || showTeamQr.value
      || showLeaderboard.value
      || showRules.value
      || showConfirmBreakdown.value
      || showFestivalMapFullscreen.value,
  ),
)

const isDev = import.meta.dev

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

const canRollNext = computed(
  () =>
    !team.value?.reachedGoal
    && edition.value?.status === 'live'
    && !turn.value,
)

const rollPromptPhrase = ref('')
watch(
  canRollNext,
  (can) => {
    if (can) rollPromptPhrase.value = pickRollDicePrompt()
  },
  { immediate: true },
)

const diceFace = computed(() => {
  if (canRollNext.value || turn.value?.state === 'completed') return null
  const fromTurn = toDiceNumber(turn.value?.diceValue)
  if (fromTurn != null) return fromTurn
  return lastDiceValue.value
})

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
  if (turn.value?.state === 'completed') return 'Confirm turn, then roll dice'
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

const teamQrUrl = ref('')

function refreshTeamQrUrl() {
  const path = team.value?.teamQrPath
  teamQrUrl.value = path ? `${window.location.origin}${path}` : ''
}

watch(() => team.value?.teamQrPath, refreshTeamQrUrl)
onMounted(refreshTeamQrUrl)

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

const hintCosts = computed(() => edition.value?.config?.hintCosts)

const {
  hintVisible,
} = useTurnHints(turn, hintCosts, now, {
  hasMapImage: computed(() => Boolean(edition.value?.mapImageUrl)),
})

const showHintBar = computed(
  () => turn.value?.state === 'rolled' && edition.value?.config?.hintCosts,
)

const hintBarRef = ref<{ showTipsPopover: () => void } | null>(null)

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
    const cost = edition.value?.config?.hintCosts.revealAll ?? 50
    const ok = await pixelConfirm({
      title: 'Reveal all hints',
      message: `Reveal all hints now for −${cost} points?`,
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
    hintBarRef.value?.showTipsPopover()
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

async function simulateScan() {
  loading.value = true
  actionError.value = ''
  try {
    await api(`/api/dev/turns/${turn.value!.id}/simulate-scan`, { method: 'POST' })
    showScanner.value = false
    await refresh()
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    actionError.value = err.data?.statusMessage ?? 'Simulate scan failed'
  }
  finally {
    loading.value = false
  }
}

function fillCorrectAnswer() {
  const payload = (turn.value?.station as { taskPayload?: { answers?: string[] } } | null)?.taskPayload
  const answer = payload?.answers?.[0]
  if (answer) quizAnswer.value = answer
}

async function completePerformanceDev() {
  loading.value = true
  actionError.value = ''
  try {
    await api(`/api/dev/turns/${turn.value!.id}/complete-performance`, { method: 'POST' })
    await refresh()
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    actionError.value = err.data?.statusMessage ?? 'Complete performance failed'
  }
  finally {
    loading.value = false
  }
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
        :roll-prompt="canRollNext ? rollPromptPhrase : null"
        @dice-click="onDiceClick"
      >
        <template v-if="showHintBar && turn" #board-actions>
          <PixelHintBar
            ref="hintBarRef"
            :turn="turn"
            :hint-costs="edition.config.hintCosts"
            :has-map-image="Boolean(edition.mapImageUrl)"
            :disabled="loading"
            :now="now"
            @show-now="(level: 1 | 2 | 3) => useHint(level)"
            @show-all="useHint(undefined, 'reveal_all')"
          />
        </template>
      </PixelGameBoard>
      <template #fallback>
        <div class="pixel-card min-h-[12rem] p-3" aria-hidden="true" />
      </template>
    </ClientOnly>

    <section v-if="edition" class="pixel-card space-y-2 p-3">
      <p class="pixel-title text-xs text-center">Festival map</p>
      <PixelFestivalMap
        expandable
        :map-image-url="edition.mapImageUrl ?? null"
        :pins="mapPins"
        @expand="showFestivalMapFullscreen = true"
      />
      <PixelFestivalMapFullscreen
        :open="showFestivalMapFullscreen"
        :map-image-url="edition.mapImageUrl ?? null"
        :pins="mapPins"
        @close="showFestivalMapFullscreen = false"
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

      <section v-else-if="turn && turn.state === 'rolled'">
        <div class="pixel-card space-y-2 p-4 text-center">
          <p class="pixel-body text-sm">
            Seeking field <strong>{{ turn.positionPending }}</strong> of {{ edition?.fieldCount }}
          </p>
          <p class="pixel-body text-sm">{{ turn.station?.hintVague }}</p>
          <p v-if="hintVisible(1)" class="pixel-body text-sm">{{ turn.station?.hintLevel1 }}</p>
          <p v-if="hintVisible(2)" class="pixel-body text-sm">{{ turn.station?.hintLevel2 }}</p>
          <p v-if="hintVisible(3)" class="pixel-body text-xs opacity-80">
            Map hint unlocked — see the festival map above.
          </p>
        </div>

      </section>

      <section v-else-if="turn && turn.state === 'scanned'" class="pixel-card space-y-4 p-4">
        <p class="pixel-title text-xs">Quiz</p>
        <p class="pixel-body text-sm">{{ quizQuestion }}</p>
        <input v-model="quizAnswer" class="pixel-input w-full p-3">
        <PixelButton
          v-if="isDev"
          variant="secondary"
          :disabled="loading"
          @click="fillCorrectAnswer"
        >
          Use correct answer (dev)
        </PixelButton>
        <PixelButton :disabled="loading" @click="submitAnswer">Submit answer</PixelButton>
      </section>

      <section v-else-if="turn && turn.state === 'awaiting_crew'" class="pixel-card space-y-4 p-4 text-center">
        <p class="pixel-title text-xs">Performance</p>
        <p class="pixel-body text-sm">{{ performanceText }}</p>
        <p class="pixel-body text-sm opacity-80">Waiting for crew…</p>
        <PixelButton
          v-if="isDev"
          variant="secondary"
          :disabled="loading"
          @click="completePerformanceDev"
        >
          Complete performance (dev)
        </PixelButton>
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
      <PixelButton
        v-if="isDev && canScanStation"
        variant="secondary"
        class="w-full"
        :disabled="loading"
        @click="simulateScan"
      >
        Simulate scan (dev)
      </PixelButton>
    </PixelDialog>

    <PixelDialog :open="showTeamQr" title="Your Team QR" @close="showTeamQr = false">
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
