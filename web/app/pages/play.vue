<script setup lang="ts">
import type { BoardTeam } from '~/components/pixel/GameBoard.vue'
import type { FestivalMapPin } from '~/components/pixel/FestivalMap.vue'
import { joinPath } from '#shared/edition-urls'
import type { LocalizedString, LocalizedStringList } from '#shared/localized'
import type { TurnScoreBreakdown } from '#shared/scoring'
import { normalizeQuizInputMode } from '#shared/quiz-payload'
import type { QuizInputMode } from '#shared/types'
import { pickRollDicePrompt } from '~/utils/roll-dice-prompts'
import { mapApiError } from '~/utils/api-errors'

/** Team session, board layout, dialogs, and QR — client-only to avoid SSR/HMR drift in dev. */
definePageMeta({ ssr: false, layout: 'player' })

const { t, locale, getLocaleMessage } = useI18n()
const { localized, localizedList } = useLocalizedContent(locale)
const route = useRoute()
const { api } = useGameApi()
const { flash, show: showScore } = useScoreFeedback()
const { confirm: pixelConfirm } = usePixelConfirm()

const showScanner = ref(false)
const showTeamQr = ref(false)
const showMenu = ref(false)
const showLeaderboard = ref(false)
const showRules = ref(false)
const showFestivalMapFullscreen = ref(false)
const mapSectionRef = ref<HTMLElement | null>(null)
const scoreAtTurnStart = ref<number | null>(null)
const turnScoreSummary = ref<{ breakdown: TurnScoreBreakdown; newScore: number } | null>(null)
const summaryShownForTurnId = ref<number | null>(null)

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
      || showMenu.value
      || showLeaderboard.value
      || showRules.value
      || showFestivalMapFullscreen.value,
  ),
)

const showDevSimulation = computed(
  () => import.meta.dev || me.value?.devSimulation === true,
)

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

function refreshRollPrompt() {
  const messages = getLocaleMessage(locale.value) as { dice?: { prompts?: unknown } }
  const raw = messages?.dice?.prompts
  const prompts = Array.isArray(raw)
    ? raw.filter((p): p is string => typeof p === 'string')
    : []
  rollPromptPhrase.value = pickRollDicePrompt(prompts)
}

watch(canRollNext, (can) => {
  if (can) refreshRollPrompt()
}, { immediate: true })

watch(locale, () => {
  if (canRollNext.value) refreshRollPrompt()
})

const diceFace = computed(() => {
  if (canRollNext.value) return null
  const fromTurn = toDiceNumber(turn.value?.diceValue)
  if (fromTurn != null) return fromTurn
  return lastDiceValue.value
})

const canReroll = computed(
  () =>
    (turn.value?.state === 'rolled' && turn.value.canRollAgain)
    || turn.value?.state === 'awaiting_crew',
)

const diceInteractive = computed(() => canRollNext.value)

const canScan = computed(() => turn.value?.state === 'rolled')

const diceTooltip = computed(() => {
  if (canRollNext.value) return t('play.diceRoll')
  if (diceFace.value != null) return t('play.diceLastRoll', { n: diceFace.value })
  return t('play.diceRoll')
})

async function onDiceClick() {
  if (canRollNext.value) await roll()
}

type OpenTurnTask = {
  fieldNumber: number
  hintVague: LocalizedString
  hintLevel1: LocalizedString
  hintLevel2: LocalizedString
  mapX: number
  mapY: number
  activityType: string
  activityPayload: {
    type: string
    question?: LocalizedString
    inputMode?: QuizInputMode
    choices?: LocalizedStringList
    text?: LocalizedString
  }
}

const openTask = computed((): OpenTurnTask | null =>
  (turn.value?.task as OpenTurnTask | null | undefined) ?? null,
)

const taskHintVague = computed(() => localized(openTask.value?.hintVague))
const taskHintLevel1 = computed(() => localized(openTask.value?.hintLevel1))
const taskHintLevel2 = computed(() => localized(openTask.value?.hintLevel2))

const quizQuestion = computed(() => {
  const payload = openTask.value?.activityPayload
  return localized(payload?.question)
})

const quizInputMode = computed((): QuizInputMode => {
  const payload = openTask.value?.activityPayload
  if (payload?.type !== 'quiz') return 'freeText'
  return normalizeQuizInputMode({
    type: 'quiz',
    question: payload.question ?? { de: '', en: '' },
    inputMode: payload.inputMode,
    choices: payload.choices,
    answers: { de: [], en: [] },
  })
})

const quizChoices = computed(() => {
  const payload = openTask.value?.activityPayload
  return localizedList(payload?.choices)
})

const canSubmitQuiz = computed(() => {
  if (quizInputMode.value === 'multipleChoice') return quizAnswer.value.length > 0
  return quizAnswer.value.trim().length > 0
})

function selectQuizChoice(choice: string) {
  quizAnswer.value = choice
}

const performanceText = computed(() => {
  const payload = openTask.value?.activityPayload
  return localized(payload?.text)
})

const playStepLabel = computed(() => {
  if (team.value?.reachedGoal || edition.value?.status !== 'live') return null
  if (!turn.value) return t('play.step1')
  switch (turn.value.state) {
    case 'rolled': return t('play.step2')
    case 'scanned':
    case 'awaiting_crew': return t('play.step3')
    default: return null
  }
})

const hasFestivalMap = computed(() => Boolean(edition.value?.mapImageUrl))

const showFestivalMap = computed(() => {
  if (!hasFestivalMap.value) return false
  const t = turn.value
  if (!t || t.state !== 'rolled') return false
  return hintVisible(3) || t.hintMode === 'reveal_all'
})

function openFestivalMapFromMenu() {
  showMenu.value = false
  if (!hasFestivalMap.value) return
  showFestivalMapFullscreen.value = true
}

const showTeamQrInHeader = computed(
  () => turn.value?.state !== 'awaiting_crew',
)

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
      if (turn.value?.state === 'rolled') scanTask()
    })
  }
})

const hintCosts = computed(() => edition.value?.config?.hintCosts)

const {
  hintVisible,
  hint3Text,
} = useTurnHints(turn, hintCosts, now, {
  hasMapImage: computed(() => Boolean(edition.value?.mapImageUrl)),
})

const showHintBar = computed(
  () => turn.value?.state === 'rolled' && edition.value?.config?.hintCosts,
)

watch(
  () => hintVisible(3) && showFestivalMap.value,
  (show) => {
    if (!show) return
    nextTick(() => {
      mapSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  },
)

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
    actionError.value = mapApiError(err.data?.statusMessage, 'play.errors.rollFailed', t)
  }
  finally {
    loading.value = false
  }
}

async function useHint(level?: number, mode?: 'reveal_all') {
  if (mode === 'reveal_all') {
    const cost = edition.value?.config?.hintCosts.revealAll ?? 50
    const ok = await pixelConfirm({
      title: t('play.revealAllTitle'),
      message: t('play.revealAllMessage', { cost }),
      confirmLabel: t('play.revealAllConfirm'),
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
    actionError.value = mapApiError(err.data?.statusMessage, 'play.errors.hintFailed', t)
  }
  finally {
    loading.value = false
  }
}

async function scanTask() {
  loading.value = true
  actionError.value = ''
  try {
    await api(`/api/turns/${turn.value!.id}/scan`, {
      method: 'POST',
      body: { taskSlug: scanSlug.value, token: scanToken.value },
    })
    showScanner.value = false
    await refresh()
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    actionError.value = mapApiError(err.data?.statusMessage, 'play.errors.scanFailed', t)
  }
  finally {
    loading.value = false
  }
}

function onQrScanned(payload: { slug: string; token: string }) {
  scanSlug.value = payload.slug
  scanToken.value = payload.token
  scanTask()
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
    actionError.value = mapApiError(err.data?.statusMessage, 'play.errors.simulateScanFailed', t)
  }
  finally {
    loading.value = false
  }
}

async function fillCorrectAnswer() {
  loading.value = true
  actionError.value = ''
  try {
    const res = await api<{ answer: string }>(
      `/api/dev/turns/${turn.value!.id}/quiz-answer`,
    )
    quizAnswer.value = res.answer
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    actionError.value = err.data?.statusMessage ?? 'Could not load correct answer'
  }
  finally {
    loading.value = false
  }
}

function showTurnScoreSummary(breakdown: TurnScoreBreakdown, newScore: number, turnId?: number) {
  turnScoreSummary.value = { breakdown, newScore }
  if (turnId != null) summaryShownForTurnId.value = turnId
}

async function fetchTurnScoreSummary(turnId: number): Promise<boolean> {
  if (summaryShownForTurnId.value === turnId) return true
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await api<{ breakdown: TurnScoreBreakdown; newScore: number }>(
        `/api/turns/${turnId}/score-summary`,
      )
      if (res.breakdown != null && res.newScore != null) {
        showTurnScoreSummary(res.breakdown, res.newScore, turnId)
        return true
      }
      return false
    }
    catch {
      if (attempt < 2) await new Promise((r) => setTimeout(r, 400))
    }
  }
  return false
}

async function completePerformanceDev() {
  loading.value = true
  actionError.value = ''
  const turnId = turn.value!.id
  try {
    const res = await api<{
      breakdown?: TurnScoreBreakdown
      newScore?: number
    }>(`/api/dev/turns/${turnId}/complete-performance`, { method: 'POST' })
    if (res.breakdown != null && res.newScore != null) {
      showTurnScoreSummary(res.breakdown, res.newScore, turnId)
    }
    await refresh()
    await refreshLeaderboard()
    if (turnScoreSummary.value == null) await fetchTurnScoreSummary(turnId)
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    actionError.value = mapApiError(err.data?.statusMessage, 'play.errors.completePerformanceFailed', t)
  }
  finally {
    loading.value = false
  }
}

function closeTurnScoreSummary() {
  turnScoreSummary.value = null
}

async function submitAnswer() {
  loading.value = true
  actionError.value = ''
  try {
    const res = await api<{
      correct: boolean
      penaltyPoints?: number
      scoreDelta?: number
      newScore?: number
      breakdown?: TurnScoreBreakdown
    }>(
      `/api/turns/${turn.value!.id}/answer`,
      { method: 'POST',
        body: { answer: quizAnswer.value, locale: locale.value } },
    )
    if (!res.correct) showScore(-(res.penaltyPoints ?? 5))
    else if (res.breakdown != null && res.newScore != null) {
      showTurnScoreSummary(res.breakdown, res.newScore, turn.value!.id)
    }
    await refresh()
    await refreshLeaderboard()
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    actionError.value = mapApiError(err.data?.statusMessage, 'play.errors.answerFailed', t)
  }
  finally {
    loading.value = false
  }
}

async function abandonTurn() {
  const ok = await pixelConfirm({
    title: t('play.zeroRoundTitle'),
    message: t('play.zeroRoundMessage'),
    confirmLabel: t('common.continue'),
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
    actionError.value = mapApiError(err.data?.statusMessage, 'play.errors.abandonFailed', t)
  }
  finally {
    loading.value = false
  }
}

watch(
  () => turn.value?.id,
  (id, prevId) => {
    if (id != null && id !== prevId) {
      scoreAtTurnStart.value = team.value?.scoreTotal ?? 0
      if (summaryShownForTurnId.value != null && summaryShownForTurnId.value !== id) {
        summaryShownForTurnId.value = null
      }
    }
  },
)

watch(
  () => turn.value,
  async (current, previous) => {
    if (!previous || current || previous.state !== 'awaiting_crew') return
    const turnId = previous.id
    const scoreBefore = scoreAtTurnStart.value
    scoreAtTurnStart.value = null
    const shown = await fetchTurnScoreSummary(turnId)
    if (!shown && scoreBefore != null) {
      const delta = (team.value?.scoreTotal ?? 0) - scoreBefore
      if (delta !== 0) showScore(delta)
    }
  },
)

let pollTimer: ReturnType<typeof setInterval> | null = null
watch(
  () => turn.value?.state,
  (state) => {
    if (pollTimer) clearInterval(pollTimer)
    if (state === 'awaiting_crew') {
      pollTimer = setInterval(async () => {
        await refresh()
        await refreshLeaderboard()
      }, 3000)
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
        <p class="pixel-title text-xs opacity-90">{{ $t('play.score', { n: team?.scoreTotal ?? 0 }) }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <PixelButton
          variant="highlight"
          class="!w-auto !min-h-0 !py-2 !px-3 !text-[10px]"
          @click="showMenu = true"
        >
          {{ $t('play.menu') }}
        </PixelButton>
        <div class="ml-auto flex items-center gap-2">
          <PixelIconButton
            v-if="showTeamQrInHeader"
            :label="$t('common.teamQr')"
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

    <p v-if="playStepLabel" class="pixel-title text-center text-xs opacity-90">{{ playStepLabel }}</p>

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
      />
      <template #fallback>
        <div class="pixel-card min-h-[12rem] p-3" aria-hidden="true" />
      </template>
    </ClientOnly>

    <p v-if="actionError" class="text-center text-sm text-[var(--pixel-score-minus)]">{{ actionError }}</p>

    <div class="play-actions space-y-4">
      <section v-if="team?.reachedGoal" class="pixel-card p-4 text-center">
        <p class="pixel-title text-xs">{{ $t('play.reachedGoal') }}</p>
      </section>

      <section v-else-if="!turn && edition?.status !== 'live'" class="pixel-card p-4">
        <p class="text-center text-xs opacity-70">{{ $t('play.gameStatus', { status: edition?.status }) }}</p>
      </section>

      <section v-else-if="turn && turn.state === 'rolled'" class="relative z-10 space-y-3">
        <div class="pixel-card seeking-card p-4">
          <div class="seeking-card__action space-y-4 text-center">
            <p class="pixel-title text-xs">{{ $t('play.findSpot') }}</p>
            <p class="pixel-body text-base seeking-card__hint-vague text-left">{{ taskHintVague }}</p>
            <PixelButton :disabled="loading" @click="showScanner = true">{{ $t('play.scanQr') }}</PixelButton>
          </div>

          <div class="seeking-card__hints space-y-3">
            <p class="pixel-title text-[10px] opacity-80">{{ $t('play.hintsSection') }}</p>
            <p v-if="hintVisible(1)" class="pixel-body text-sm seeking-card__hint-line">
              {{ taskHintLevel1 }}
            </p>
            <p v-if="hintVisible(2)" class="pixel-body text-sm seeking-card__hint-line">
              {{ taskHintLevel2 }}
            </p>
            <p v-if="hintVisible(3)" class="pixel-body text-sm seeking-card__hint-line">
              {{ hint3Text }}
            </p>
            <div v-if="showHintBar" class="seeking-card__hint-controls">
              <PixelHintBar
                embedded
                :turn="turn"
                :hint-costs="edition!.config.hintCosts"
                :has-map-image="Boolean(edition?.mapImageUrl)"
                :disabled="loading"
                :now="now"
                @show-now="(level: 1 | 2 | 3) => useHint(level)"
                @show-all="useHint(undefined, 'reveal_all')"
              />
            </div>
          </div>
        </div>

        <button
          v-if="canReroll"
          type="button"
          class="seeking-card__roll-again"
          :disabled="loading"
          @click="abandonTurn"
        >
          {{ $t('play.rollAgain') }}
        </button>
      </section>

      <section v-else-if="turn && turn.state === 'scanned'" class="pixel-card space-y-4 p-4">
        <p class="pixel-title text-xs">{{ $t('play.quiz') }}</p>
        <p class="pixel-body text-sm">{{ quizQuestion }}</p>
        <div v-if="quizInputMode === 'multipleChoice'" class="space-y-2">
          <button
            v-for="choice in quizChoices"
            :key="choice"
            type="button"
            class="pixel-quiz-choice w-full p-3 text-sm"
            :class="{ 'pixel-quiz-choice--selected': quizAnswer === choice }"
            :aria-pressed="quizAnswer === choice"
            :disabled="loading"
            @click="selectQuizChoice(choice)"
          >
            <span class="pixel-quiz-choice__indicator" aria-hidden="true" />
            <span>{{ choice }}</span>
          </button>
        </div>
        <input
          v-else
          v-model="quizAnswer"
          class="pixel-input w-full p-3"
        >
        <PixelButton
          v-if="showDevSimulation"
          variant="secondary"
          :disabled="loading"
          @click="fillCorrectAnswer"
        >
          {{ $t('play.useCorrectAnswerDev') }}
        </PixelButton>
        <PixelButton :disabled="loading || !canSubmitQuiz" @click="submitAnswer">
          {{ $t('play.submit') }}
        </PixelButton>
      </section>

      <section v-else-if="turn && turn.state === 'awaiting_crew'" class="pixel-card space-y-4 p-4 text-center">
        <p class="pixel-title text-xs">{{ $t('play.performance') }}</p>
        <p class="pixel-body text-sm">{{ performanceText }}</p>
        <p class="pixel-body text-sm">{{ $t('play.showQrToCrew') }}</p>
        <img
          v-if="teamQrUrl"
          :src="`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(teamQrUrl)}`"
          :alt="$t('common.teamQrAlt')"
          class="mx-auto border-4 border-[var(--pixel-forest-dark)]"
          width="220"
          height="220"
        >
        <p class="pixel-body text-sm opacity-80">{{ $t('play.waitingForCrew') }}</p>
        <PixelButton
          v-if="canReroll"
          variant="secondary"
          :disabled="loading"
          @click="abandonTurn"
        >
          {{ $t('play.rollAgain') }}
        </PixelButton>
        <PixelButton
          v-if="showDevSimulation"
          variant="secondary"
          :disabled="loading"
          @click="completePerformanceDev"
        >
          {{ $t('play.completePerformanceDev') }}
        </PixelButton>
      </section>
    </div>

    <section
      v-if="edition && showFestivalMap"
      ref="mapSectionRef"
      class="relative z-0 pixel-card space-y-2 p-3"
    >
      <p class="pixel-title text-xs text-center">{{ $t('play.festivalMap') }}</p>
      <PixelFestivalMap
        expandable
        :map-image-url="edition.mapImageUrl ?? null"
        :pins="mapPins"
        @expand="showFestivalMapFullscreen = true"
      />
    </section>

    <PixelFestivalMapFullscreen
      v-if="edition && hasFestivalMap"
      :open="showFestivalMapFullscreen"
      :map-image-url="edition.mapImageUrl ?? null"
      :pins="mapPins"
      @close="showFestivalMapFullscreen = false"
    />

    <PixelDialog :open="showMenu" :title="$t('play.menu')" @close="showMenu = false">
      <div class="space-y-2">
        <PixelButton variant="secondary" @click="showMenu = false; showLeaderboard = true">{{ $t('play.leaderboard') }}</PixelButton>
        <PixelButton variant="secondary" @click="showMenu = false; showRules = true">{{ $t('common.rules') }}</PixelButton>
        <PixelButton
          v-if="hasFestivalMap"
          variant="secondary"
          @click="openFestivalMapFromMenu"
        >
          {{ $t('play.festivalMap') }}
        </PixelButton>
        <PixelButton
          v-if="showTeamQrInHeader"
          variant="secondary"
          @click="showMenu = false; showTeamQr = true"
        >
          {{ $t('common.teamQr') }}
        </PixelButton>
      </div>
    </PixelDialog>

    <PixelDialog :open="showRules" :title="$t('play.gameRules')" scrollable @close="showRules = false">
      <GameRulesContent />
    </PixelDialog>

    <PixelDialog :open="showLeaderboard" :title="$t('play.leaderboard')" scrollable @close="showLeaderboard = false">
      <LeaderboardPanel
        v-if="edition"
        :edition-id="edition.id"
        :active="showLeaderboard"
      />
    </PixelDialog>

    <PixelDialog
      :open="showScanner"
      :title="$t('play.scanQr')"
      panel-class="!p-3"
      @close="showScanner = false"
    >
      <TaskQrScanner
        v-if="showScanner"
        embedded
        @scanned="onQrScanned"
        @close="showScanner = false"
      />
      <PixelButton
        v-if="showDevSimulation && canScan"
        variant="secondary"
        class="w-full"
        :disabled="loading"
        @click="simulateScan"
      >
        {{ $t('play.simulateScanDev') }}
      </PixelButton>
    </PixelDialog>

    <PixelTurnScoreSummaryDialog
      :open="turnScoreSummary != null"
      :breakdown="turnScoreSummary?.breakdown ?? null"
      :new-score="turnScoreSummary?.newScore ?? null"
      @close="closeTurnScoreSummary"
    />

    <PixelDialog :open="showTeamQr" :title="$t('play.yourTeamQr')" @close="showTeamQr = false">
      <p class="pixel-body text-center text-sm">{{ team?.name }}</p>
      <img
        v-if="teamQrUrl"
        :src="`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(teamQrUrl)}`"
        :alt="$t('common.teamQrAlt')"
        class="mx-auto border-4 border-[var(--pixel-forest-dark)]"
        width="220"
        height="220"
      >
      <p class="pixel-body break-all text-center text-xs opacity-80">{{ teamQrUrl }}</p>
    </PixelDialog>

  </main>
</template>

<style scoped>
.play-actions {
  position: sticky;
  bottom: 0.75rem;
  z-index: 10;
}

.seeking-card {
  overflow: visible;
}

.seeking-card__hints {
  border-top: 2px solid var(--pixel-forest-dark);
  margin-top: 1rem;
  padding-top: 1rem;
  text-align: left;
}

.seeking-card__hint-controls {
  margin-top: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.seeking-card__roll-again {
  display: block;
  width: 100%;
  padding: 0.5rem 0;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  line-height: 1.5;
  text-align: center;
  text-decoration: underline;
  text-underline-offset: 3px;
  color: var(--pixel-forest-dark);
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0.7;
}

.seeking-card__roll-again:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>

<style>
.seeking-card .seeking-card__hint-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem 0.75rem;
  text-align: left;
}

.seeking-card .seeking-card__hint-line--center {
  justify-content: center;
  width: 100%;
  padding-top: 0.25rem;
  text-align: center;
}

.seeking-card .seeking-card__hint-divider {
  border: none;
  border-top: 2px solid var(--pixel-forest-dark);
  margin: 0.875rem 0;
  opacity: 0.25;
}

.seeking-card .seeking-card__hint-label {
  font-weight: 700;
}

.seeking-card .seeking-card__hint-timer,
.seeking-card .seeking-card__hint-sep,
.seeking-card .seeking-card__hint-action {
  font-family: 'Press Start 2P', monospace;
  color: var(--pixel-forest-dark);
}

.seeking-card .seeking-card__hint-timer {
  font-size: 14px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.seeking-card .seeking-card__hint-sep {
  font-size: 8px;
  line-height: 1.5;
  opacity: 0.7;
}

.seeking-card .seeking-card__hint-action {
  display: inline;
  padding: 0;
  font-size: 8px;
  line-height: 1.5;
  text-decoration: underline;
  text-underline-offset: 3px;
  background: transparent;
  border: none;
  cursor: pointer;
}

.seeking-card .seeking-card__hint-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
