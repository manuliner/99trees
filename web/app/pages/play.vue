<script setup lang="ts">
import type { BoardTeam } from '~/components/pixel/GameBoard.vue'
import type { FestivalMapPin } from '~/components/pixel/FestivalMap.vue'
import { editionLandingPath } from '#shared/edition-urls'
import type { LocalizedString, LocalizedStringList } from '#shared/localized'
import type { TurnScoreBreakdown } from '#shared/scoring'
import { normalizeQuizInputMode, parseMediaActivityPayload } from '#shared/quiz-payload'
import type { CoopTurnRole, PendingCoopItem, QuizInputMode, ClientTranscodePolicy, MediaActivityPayload } from '#shared/types'
import { resolveClientTranscodePolicy } from '#shared/types'
import { pickRollDicePrompt } from '~/utils/roll-dice-prompts'
import { mapApiError } from '~/utils/api-errors'
import { useOnboardingPlayGuard } from '~/composables/useOnboardingRedirect'
import { activityBoardLetter } from '#shared/activity-board-letter'
import { boardFieldsBetween } from '#shared/game-board-layout'
import {
  moveStepMs,
  prefersReducedMotion,
  ROLL_DICE_MS,
  sleep,
} from '~/utils/roll-sequence'

/** Team session, board layout, dialogs, and QR — client-only to avoid SSR/HMR drift in dev. */
definePageMeta({ ssr: false, layout: 'player' })

const { t, locale, getLocaleMessage } = useI18n()
const { localized, localizedList } = useLocalizedContent(locale)
const route = useRoute()
const { api } = useGameApi()
const { flash, show: showScore } = useScoreFeedback()
const { confirm: pixelConfirm } = usePixelConfirm()

const showScanner = ref(false)
const showCoopBonusScanner = ref(false)
const coopLinkDepotId = ref<number | null>(null)
const showTeamQr = ref(false)
const showMenu = ref(false)
const showPwaInstall = ref(false)
const showLeaderboard = ref(false)
const { maybeAutoShow: maybeShowPwaInstall } = usePwaInstall('player')
const showRules = ref(false)
const showFestivalMapFullscreen = ref(false)
const mapSectionRef = ref<HTMLElement | null>(null)
const scoreAtTurnStart = ref<number | null>(null)
const turnScoreSummary = ref<{
  breakdown: TurnScoreBreakdown
  newScore: number
  crewConfirmedField?: number
} | null>(null)
const summaryShownForTurnId = ref<number | null>(null)

const { data: me, refresh, error: meError } = await useFetch('/api/me', {
  credentials: 'include',
  server: false,
})

watchEffect(() => {
  if (meError.value && 'statusCode' in meError.value && (meError.value as { statusCode: number }).statusCode === 401) {
    const slug = me.value?.edition?.slug
    navigateTo(slug ? editionLandingPath(slug) : '/')
  }
})

useOnboardingPlayGuard(me)

watch(
  () => me.value?.team?.id,
  (id) => {
    if (id == null) return
    maybeShowPwaInstall(() => {
      showPwaInstall.value = true
    })
  },
  { immediate: true },
)

type LeaderboardData = {
  teams: { id: number; name: string; position: number; avatarId?: string | null }[]
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
      avatarId: t.avatarId ?? null,
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

const showDevSimulation = computed(
  () => import.meta.dev,
)

type DevFieldActivity = {
  fieldNumber: number
  activityType: 'quiz' | 'performance' | 'media' | 'coop'
}

const devFieldActivities = computed((): DevFieldActivity[] => {
  if (!showDevSimulation.value) return []
  const list = me.value?.devFieldActivities
  return Array.isArray(list) ? list : []
})

const devFieldActivityLetters = computed(() => {
  const map: Record<number, string> = {}
  for (const item of devFieldActivities.value) {
    map[item.fieldNumber] = activityBoardLetter(item.activityType)
  }
  return map
})

const devPickableFields = computed(() =>
  devFieldActivities.value.map((item) => item.fieldNumber),
)

const loading = ref(false)
const scanSlug = ref('')
const scanToken = ref('')
const quizAnswer = ref('')
const actionError = ref('')

type RollSequencePhase = 'idle' | 'dice' | 'move' | 'done'
const rollSequence = ref<RollSequencePhase>('idle')
const rollSnapshot = ref<{
  dice: number
  from: number
  to: number
  completed: number[]
  playedFields?: number[]
  overflowFields?: number[]
} | null>(null)
const moveTokenField = ref<number | null>(null)
/** Move-path highlights until the turn advances. */
const moveOverflowFields = ref<number[]>([])
const moveSteppedFields = ref<number[]>([])
/** Full board highlights from server after roll — applied when move animation finishes. */
const pendingBoardHighlights = ref<{
  playedFields: number[]
  overflowFields: number[]
} | null>(null)
const showSeekingModal = ref(false)
const gameBoardRef = ref<{ scrollToFocus: () => void } | null>(null)

const rollAnimating = computed(
  () => rollSequence.value === 'dice' || rollSequence.value === 'move',
)

const turn = computed(() => me.value?.openTurn)
type PendingCrewTurnItem = {
  turnId: number
  fieldNumber: number
  scannedAt: string | null
}

const pendingCrewTurns = computed((): PendingCrewTurnItem[] => {
  const list = me.value?.pendingCrewTurns
  if (Array.isArray(list) && list.length > 0) return list
  const single = me.value?.pendingCrewTurn
  return single ? [single] : []
})

const pendingCrewHighlightFields = computed(() =>
  pendingCrewTurns.value.map((p) => p.fieldNumber),
)

const pendingCrewFieldsLabel = computed(() =>
  pendingCrewHighlightFields.value.join(', '),
)

const pendingCoopItems = computed((): PendingCoopItem[] => me.value?.pendingCoopItems ?? [])

const pendingCoopDepotItems = computed(() =>
  pendingCoopItems.value.filter((p) => p.role === 'depot_open'),
)

const pendingCoopBonusItems = computed(() =>
  pendingCoopItems.value.filter((p) => p.role === 'bonus_pending'),
)

const pendingCoopDepotFieldsLabel = computed(() =>
  pendingCoopDepotItems.value.map((p) => p.fieldNumber).join(', '),
)

const team = computed(() => me.value?.team)
const edition = computed(() => me.value?.edition)

/** Board marker position for own team (pending target while turn is open). */
const myBoardDisplayPosition = computed(() => {
  const confirmed = team.value?.positionConfirmed ?? 0
  if (!turn.value) return confirmed
  const pending = Number(turn.value.positionPending)
  if (Number.isFinite(pending) && pending > confirmed) return pending
  return confirmed
})

const boardTeams = computed((): BoardTeam[] => {
  const myId = team.value?.id
  if (myId == null) return leaderboardTeams.value

  const pos = myBoardDisplayPosition.value
  const mapped = leaderboardTeams.value.map((t) =>
    t.id === myId ? { ...t, position: pos } : t,
  )

  if (mapped.some((t) => t.id === myId)) return mapped

  if (!team.value) return mapped
  return [
    ...mapped,
    {
      id: myId,
      name: team.value.name,
      position: pos,
      avatarId: team.value.avatarId ?? null,
    },
  ]
})

const coopBonusPoints = computed(() => edition.value?.config?.coopBonusPoints ?? 25)

const {
  celebrationOpen,
  triggerDevPreview,
  closeCelebration,
} = useGoalCelebration({
  teamId: computed(() => team.value?.id),
  reachedGoal: computed(() => team.value?.reachedGoal),
  turnScoreSummary,
})

usePullToRefreshDisabled(
  computed(
    () =>
      showScanner.value
      || showCoopBonusScanner.value
      || showTeamQr.value
      || showMenu.value
      || showPwaInstall.value
      || showLeaderboard.value
      || showRules.value
      || showFestivalMapFullscreen.value
      || celebrationOpen.value
      || showSeekingModal.value
      || rollAnimating.value,
  ),
)

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
    || turn.value?.state === 'awaiting_crew'
    || turn.value?.state === 'awaiting_coop',
)

const showPendingCrewBanner = computed(
  () => pendingCrewTurns.value.length > 0 && turn.value?.state !== 'awaiting_crew',
)

const showPendingCoopBanner = computed(
  () =>
    (pendingCoopDepotItems.value.length > 0 || pendingCoopBonusItems.value.length > 0)
    && turn.value?.state !== 'awaiting_coop',
)

const diceInteractive = computed(
  () => canRollNext.value && rollSequence.value === 'idle' && !loading.value,
)

const diceLoadingBoard = computed(
  () => loading.value || rollAnimating.value,
)

const boardPositionPending = computed(() => {
  if (rollSnapshot.value && rollSequence.value !== 'idle') {
    return rollSnapshot.value.to
  }
  return turn.value?.positionPending ?? null
})

const overlayDiceValue = computed(() => {
  if (rollSequence.value === 'dice' && rollSnapshot.value) return rollSnapshot.value.dice
  return null
})

const seekingDialogTitle = computed(() => {
  const n = turn.value?.positionPending
  if (n == null) return t('play.findSpot')
  return t('play.seekingTitle', { n })
})

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
    instructions?: LocalizedString
    partnerInstructions?: LocalizedString
    allowedKinds?: ('photo' | 'video' | 'audio')[]
    maxDurationSec?: number
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

const isCoopTask = computed(() => openTask.value?.activityType === 'coop')
const isMediaTask = computed(() => openTask.value?.activityType === 'media')

const mediaPayload = computed((): MediaActivityPayload | null => {
  const payload = openTask.value?.activityPayload
  if (payload?.type !== 'media') return null
  return parseMediaActivityPayload(payload)
})

const clientTranscodePolicy = computed((): ClientTranscodePolicy =>
  resolveClientTranscodePolicy(
    me.value?.mediaUploadPolicy?.clientTranscode
    ?? edition.value?.config?.clientTranscode,
  ),
)

const mediaTaskText = computed(() => {
  const payload = openTask.value?.activityPayload
  return localized(payload?.text)
})

const coopRole = computed((): CoopTurnRole => {
  const role = turn.value?.coopRole
  return role === 'partner' ? 'partner' : 'initiator'
})

const coopTaskText = computed(() => {
  const payload = openTask.value?.activityPayload
  if (payload?.type !== 'coop') return ''
  if (coopRole.value === 'partner') return localized(payload.partnerInstructions)
  return localized(payload.instructions)
})

const playStepLabel = computed(() => {
  if (team.value?.reachedGoal || edition.value?.status !== 'live') return null
  if (!turn.value) return t('play.step1')
  switch (turn.value.state) {
    case 'rolled': return t('play.step2')
    case 'scanned':
    case 'awaiting_crew':
    case 'awaiting_coop': return t('play.step3')
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
  () => turn.value?.state !== 'awaiting_crew' && turn.value?.state !== 'awaiting_coop',
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
} = useTurnHints(turn, hintCosts, now)

const showHintBar = computed(
  () => turn.value?.state === 'rolled' && edition.value?.config?.hintCosts,
)

const MOVE_PATH_HIGHLIGHT_STATES = ['rolled', 'scanned', 'awaiting_crew', 'awaiting_coop'] as const

function isMovePathHighlightActive(): boolean {
  const state = turn.value?.state
  return state != null && (MOVE_PATH_HIGHLIGHT_STATES as readonly string[]).includes(state)
}

function applyBoardHighlights(played: number[], overflow: number[]) {
  const playedSet = new Set(played)
  moveSteppedFields.value = [...played]
  moveOverflowFields.value = overflow.filter((field) => !playedSet.has(field))
}

function resetRollAnimation() {
  rollSequence.value = 'idle'
  rollSnapshot.value = null
  moveTokenField.value = null
}

function resetRollVisualState() {
  resetRollAnimation()
}

function clearMovePathHighlights() {
  moveSteppedFields.value = []
  moveOverflowFields.value = []
  pendingBoardHighlights.value = null
}

/** End of roll animation only — keep path colors until the next roll (step 1). */
function resetRollSequenceOnly() {
  resetRollAnimation()
}

function hydratePathHighlightsFromMe() {
  if (rollAnimating.value || rollSnapshot.value) return

  const board = me.value?.boardHighlights as {
    playedFields: number[]
    overflowFields: number[]
  } | undefined
  if (!board) return

  applyBoardHighlights(
    Array.isArray(board.playedFields) ? board.playedFields.map(Number) : [],
    Array.isArray(board.overflowFields) ? board.overflowFields.map(Number) : [],
  )
}

function syncMovePathHighlightsIfNeeded() {
  if (rollAnimating.value || rollSnapshot.value) return
  hydratePathHighlightsFromMe()
}

/** During move animation: color only the field the token just entered. */
function pushMovePathHighlight(
  field: number,
  to: number,
  completed: readonly number[],
) {
  if (field === to) return
  const completedSet = new Set(completed)
  if (completedSet.has(field)) {
    if (!moveSteppedFields.value.includes(field)) {
      moveSteppedFields.value = [...moveSteppedFields.value, field]
    }
    return
  }
  if (!moveOverflowFields.value.includes(field)) {
    moveOverflowFields.value = [...moveOverflowFields.value, field]
  }
}

function finishMoveAnimationHighlights() {
  if (pendingBoardHighlights.value) {
    applyBoardHighlights(
      pendingBoardHighlights.value.playedFields,
      pendingBoardHighlights.value.overflowFields,
    )
    pendingBoardHighlights.value = null
  }
}

async function runRollSequence(
  snapshot: {
    dice: number
    from: number
    to: number
    completed: number[]
  },
  highlightsBeforeRoll: { playedFields: number[]; overflowFields: number[] },
) {
  const path = boardFieldsBetween(snapshot.from, snapshot.to)

  if (prefersReducedMotion()) {
    for (const field of path) {
      pushMovePathHighlight(field, snapshot.to, snapshot.completed)
    }
    finishMoveAnimationHighlights()
    rollSequence.value = 'done'
    showSeekingModal.value = true
    return
  }

  rollSequence.value = 'dice'
  await sleep(ROLL_DICE_MS)

  if (path.length === 0) {
    finishMoveAnimationHighlights()
    rollSequence.value = 'done'
    showSeekingModal.value = true
    return
  }

  rollSequence.value = 'move'
  applyBoardHighlights(
    highlightsBeforeRoll.playedFields,
    highlightsBeforeRoll.overflowFields,
  )
  const stepMs = moveStepMs(path.length)
  for (const field of path) {
    moveTokenField.value = field
    pushMovePathHighlight(field, snapshot.to, snapshot.completed)
    await sleep(stepMs)
  }
  moveTokenField.value = null
  finishMoveAnimationHighlights()
  rollSequence.value = 'done'
  showSeekingModal.value = true
  await nextTick()
  gameBoardRef.value?.scrollToFocus()
}

type RollApiResponse = {
  dice: number
  positionPending: number
  boardHighlights?: { playedFields: number[]; overflowFields: number[] }
}

async function executeRoll(
  rollUrl: string,
  body: Record<string, unknown> = {},
) {
  if (rollAnimating.value) return
  loading.value = true
  actionError.value = ''
  const from = team.value?.positionConfirmed ?? 0
  const completedAtRoll = [...(team.value?.completedFields ?? [])]
  const highlightsBeforeRoll = {
    playedFields: [...moveSteppedFields.value],
    overflowFields: [...moveOverflowFields.value],
  }
  try {
    const res = await api<RollApiResponse>(rollUrl, { method: 'POST', body })
    const rolled = toDiceNumber(res.dice)
    const to = Number(res.positionPending)
    if (rolled == null || !Number.isFinite(to)) {
      throw new Error('Invalid roll response')
    }
    lastDiceValue.value = rolled
    rollSnapshot.value = {
      dice: rolled,
      from,
      to,
      completed: completedAtRoll,
    }
    pendingBoardHighlights.value = res.boardHighlights
      ? {
          playedFields: res.boardHighlights.playedFields.map(Number),
          overflowFields: res.boardHighlights.overflowFields.map(Number),
        }
      : null
    try {
      await refresh()
    }
    catch {
      resetRollVisualState()
      pendingBoardHighlights.value = null
      actionError.value = t('play.errors.rollFailed')
      return
    }
    loading.value = false
    if (rollSnapshot.value) {
      await runRollSequence(rollSnapshot.value, highlightsBeforeRoll)
    }
    else {
      finishMoveAnimationHighlights()
    }
    await refresh()
    hydratePathHighlightsFromMe()
    await refreshLeaderboard()
  }
  catch (e: unknown) {
    resetRollVisualState()
    pendingBoardHighlights.value = null
    showSeekingModal.value = false
    const err = e as { data?: { statusMessage?: string } }
    actionError.value = mapApiError(err.data?.statusMessage, 'play.errors.rollFailed', t)
  }
  finally {
    loading.value = false
  }
}

async function roll() {
  await executeRoll('/api/turns/roll')
}

async function rollAtField(field: number) {
  if (!showDevSimulation.value || !canRollNext.value || rollAnimating.value) return
  await executeRoll('/api/dev/turns/roll', { targetField: field })
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
    syncMovePathHighlightsIfNeeded()
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
    syncMovePathHighlightsIfNeeded()
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

async function logoutDev() {
  const slug = edition.value?.slug
  showMenu.value = false
  try {
    await api('/api/teams/logout', { method: 'POST' })
  }
  catch {
    // still leave play in dev if cookie clear failed
  }
  await navigateTo(slug ? editionLandingPath(slug) : '/')
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

const EMPTY_TURN_BREAKDOWN: TurnScoreBreakdown = {
  base: 0,
  timeBonus: 0,
  crewBonus: 0,
  hintsDuringTurn: 0,
  hintsAtConfirm: 0,
  quizPenalty: 0,
  total: 0,
}

function showTurnScoreSummary(
  breakdown: TurnScoreBreakdown,
  newScore: number,
  turnId?: number,
  options?: { crewConfirmedField?: number },
) {
  if (breakdown.total === 0 && options?.crewConfirmedField == null) {
    if (turnId != null) summaryShownForTurnId.value = turnId
    return
  }
  turnScoreSummary.value = {
    breakdown,
    newScore,
    crewConfirmedField: options?.crewConfirmedField,
  }
  if (turnId != null) summaryShownForTurnId.value = turnId
}

function showPerformanceCrewConfirmed(
  fieldNumber: number,
  turnId: number,
  breakdown?: TurnScoreBreakdown,
  newScore?: number,
) {
  showTurnScoreSummary(
    breakdown ?? EMPTY_TURN_BREAKDOWN,
    newScore ?? team.value?.scoreTotal ?? 0,
    turnId,
    { crewConfirmedField: fieldNumber },
  )
}

async function fetchTurnScoreSummary(
  turnId: number,
  crewConfirmedField?: number,
): Promise<boolean> {
  if (summaryShownForTurnId.value === turnId) return true
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await api<{ breakdown: TurnScoreBreakdown; newScore: number; scoreDelta?: number }>(
        `/api/turns/${turnId}/score-summary`,
      )
      if (res.breakdown != null && res.newScore != null) {
        if (res.scoreDelta === 0 && crewConfirmedField == null) {
          summaryShownForTurnId.value = turnId
          return false
        }
        showTurnScoreSummary(res.breakdown, res.newScore, turnId, {
          crewConfirmedField,
        })
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

async function onPerformanceCrewConfirmed(turnId: number, fieldNumber: number) {
  const scoreBefore = scoreAtTurnStart.value
  scoreAtTurnStart.value = null
  const shown = await fetchTurnScoreSummary(turnId, fieldNumber)
  if (!shown) {
    showPerformanceCrewConfirmed(fieldNumber, turnId)
    if (scoreBefore != null) {
      const delta = (team.value?.scoreTotal ?? 0) - scoreBefore
      if (delta !== 0) showScore(delta)
    }
  }
  await refreshLeaderboard()
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
      reachedGoal?: boolean
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
    syncMovePathHighlightsIfNeeded()
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

function syncMovePathFromOpenTurn() {
  hydratePathHighlightsFromMe()
}

watch(
  () => turn.value?.state,
  (state) => {
    if (state === 'rolled' && rollSequence.value === 'idle' && !rollSnapshot.value) {
      syncMovePathFromOpenTurn()
      showSeekingModal.value = true
      rollSequence.value = 'done'
    }
    if (state !== 'rolled') {
      showSeekingModal.value = false
    }
  },
  { immediate: true },
)

watch(
  () => [
    me.value?.team?.id,
    me.value?.boardHighlights,
    me.value?.team?.completedFields,
    rollAnimating.value,
    rollSnapshot.value,
  ] as const,
  () => {
    syncMovePathHighlightsIfNeeded()
  },
  { immediate: true, deep: true },
)

watch(
  () => turn.value,
  async (t, prev) => {
    if (!t && prev && !rollAnimating.value) {
      resetRollSequenceOnly()
      await refresh()
    }
  },
)

async function completeCoop() {
  loading.value = true
  actionError.value = ''
  const turnId = turn.value!.id
  try {
    const res = await api<{
      scoreDelta?: number
      newScore?: number
      breakdown?: TurnScoreBreakdown
      reachedGoal?: boolean
    }>(`/api/turns/${turnId}/coop/complete`, { method: 'POST' })
    if (res.breakdown != null && res.newScore != null) {
      showTurnScoreSummary(res.breakdown, res.newScore, turnId)
    }
    await refresh()
    syncMovePathHighlightsIfNeeded()
    await refreshLeaderboard()
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    actionError.value = mapApiError(err.data?.statusMessage, 'play.errors.completeCoopFailed', t)
  }
  finally {
    loading.value = false
  }
}

function openCoopBonusScanner(depotId?: number) {
  coopLinkDepotId.value = depotId ?? null
  showCoopBonusScanner.value = true
}

async function onCoopTeamQrScanned(payload: { slug: string; token: string }) {
  loading.value = true
  actionError.value = ''
  try {
    const body: { partnerSlug: string; token: string; depotId?: number } = {
      partnerSlug: payload.slug,
      token: payload.token,
    }
    if (coopLinkDepotId.value != null) body.depotId = coopLinkDepotId.value
    const res = await api<{ bonusPoints: number; newScore: number }>('/api/coop/link', {
      method: 'POST',
      body,
    })
    showCoopBonusScanner.value = false
    coopLinkDepotId.value = null
    if (res.bonusPoints) showScore(res.bonusPoints)
    await refresh()
    await refreshLeaderboard()
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    actionError.value = mapApiError(err.data?.statusMessage, 'play.errors.coopLinkFailed', t)
  }
  finally {
    loading.value = false
  }
}

async function onMediaUploaded() {
  await refresh()
}

async function continuePlaying() {
  const turnId = turn.value?.id
  if (turnId == null || turn.value?.state !== 'awaiting_crew') return
  loading.value = true
  actionError.value = ''
  scoreAtTurnStart.value = team.value?.scoreTotal ?? 0
  try {
    await api(`/api/turns/${turnId}/continue-playing`, { method: 'POST' })
    resetRollVisualState()
    clearMovePathHighlights()
    showSeekingModal.value = false
    await refresh()
    hydratePathHighlightsFromMe()
    await refreshLeaderboard()
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    actionError.value = mapApiError(
      err.data?.statusMessage,
      'play.errors.continuePlayingFailed',
      t,
    )
  }
  finally {
    loading.value = false
  }
}

async function continuePlayingCoop() {
  const turnId = turn.value?.id
  if (turnId == null || turn.value?.state !== 'awaiting_coop') return
  loading.value = true
  actionError.value = ''
  scoreAtTurnStart.value = team.value?.scoreTotal ?? 0
  try {
    await api(`/api/turns/${turnId}/coop/continue-playing`, { method: 'POST' })
    resetRollVisualState()
    clearMovePathHighlights()
    showSeekingModal.value = false
    await refresh()
    hydratePathHighlightsFromMe()
    await refreshLeaderboard()
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    actionError.value = mapApiError(
      err.data?.statusMessage,
      'play.errors.continuePlayingFailed',
      t,
    )
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
  resetRollVisualState()
  clearMovePathHighlights()
  showSeekingModal.value = false
  const turnId = turn.value!.id
  summaryShownForTurnId.value = turnId
  loading.value = true
  actionError.value = ''
  try {
    await api(`/api/turns/${turnId}/abandon`, { method: 'POST' })
    await refresh()
    hydratePathHighlightsFromMe()
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
  pendingCrewTurns,
  async (current, previous) => {
    if (!previous?.length) return
    const currentIds = new Set(current.map((p) => p.turnId))
    for (const prev of previous) {
      if (!currentIds.has(prev.turnId)) {
        await onPerformanceCrewConfirmed(prev.turnId, prev.fieldNumber)
      }
    }
  },
  { deep: true },
)

let pollTimer: ReturnType<typeof setInterval> | null = null
watch(
  () =>
    [
      turn.value?.state,
      pendingCrewTurns.value.length,
      pendingCoopItems.value.length,
    ] as const,
  ([state, crewPendingCount, coopPendingCount]) => {
    if (pollTimer) clearInterval(pollTimer)
    if (
      state === 'awaiting_crew'
      || state === 'awaiting_coop'
      || crewPendingCount > 0
      || coopPendingCount > 0
    ) {
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
      <div class="flex min-w-0 items-start gap-2">
        <PixelTeamAvatarBadge
          v-if="team?.avatarId"
          :avatar-id="team.avatarId"
          size="md"
        />
        <div class="min-w-0 flex-1">
          <h1 class="pixel-title truncate text-sm">{{ team?.name ?? '…' }}</h1>
          <p
            v-if="team?.motto"
            class="pixel-body truncate text-[10px] opacity-80"
          >
            „{{ team.motto }}“
          </p>
          <p class="pixel-title text-xs opacity-90">{{ $t('play.score', { n: team?.scoreTotal ?? 0 }) }}</p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <PixelButton
          variant="highlight"
          class="!w-auto !min-h-0 !py-2 !px-3 !text-[10px]"
          :disabled="rollAnimating"
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

    <section
      v-if="showPendingCrewBanner"
      class="pixel-card space-y-2 p-3 text-center"
    >
      <p class="pixel-body text-xs">
        {{
          pendingCrewTurns.length === 1
            ? $t('play.pendingCrewBanner', { n: pendingCrewTurns[0]!.fieldNumber })
            : $t('play.pendingCrewBannerMultiple', { fields: pendingCrewFieldsLabel })
        }}
      </p>
      <PixelButton
        variant="secondary"
        class="!w-auto !min-h-0 !py-2 !px-3 !text-[10px] mx-auto"
        @click="showTeamQr = true"
      >
        {{ $t('play.showTeamQr') }}
      </PixelButton>
    </section>

    <section
      v-for="item in pendingCoopDepotItems"
      v-show="showPendingCoopBanner"
      :key="`coop-depot-${item.depotId}`"
      class="pixel-card space-y-2 p-3 text-center"
    >
      <p class="pixel-body text-xs">
        {{
          pendingCoopDepotItems.length === 1
            ? $t('play.pendingCoopDepotBanner', { n: item.fieldNumber })
            : $t('play.pendingCoopDepotBannerMultiple', { fields: pendingCoopDepotFieldsLabel })
        }}
      </p>
    </section>

    <section
      v-for="item in pendingCoopBonusItems"
      v-show="showPendingCoopBanner"
      :key="`coop-bonus-${item.depotId}`"
      class="pixel-card space-y-2 p-3 text-center"
    >
      <p class="pixel-body text-xs">
        {{
          item.partnerTeamName
            ? $t('play.pendingCoopBonusBanner', {
              n: item.fieldNumber,
              team: item.partnerTeamName,
              bonus: coopBonusPoints,
            })
            : $t('play.pendingCoopBonusBannerNoTeam', {
              n: item.fieldNumber,
              bonus: coopBonusPoints,
            })
        }}
      </p>
      <PixelButton
        variant="secondary"
        class="!w-auto !min-h-0 !py-2 !px-3 !text-[10px] mx-auto"
        @click="openCoopBonusScanner(item.depotId)"
      >
        {{ $t('play.coopScanTeamQrBonus') }}
      </PixelButton>
    </section>

    <ClientOnly>
      <div v-if="edition" class="relative">
        <PixelGameBoard
          ref="gameBoardRef"
          :field-count="edition.fieldCount"
          :position-confirmed="team?.positionConfirmed ?? 0"
          :position-pending="boardPositionPending"
          :move-token-field="moveTokenField"
          :move-overflow-fields="moveOverflowFields"
          :move-stepped-fields="moveSteppedFields"
          :pending-crew-fields="pendingCrewHighlightFields"
          :suppress-my-team-chip="rollSequence === 'move'"
          :my-team-id="team?.id ?? null"
          :my-avatar-id="team?.avatarId ?? null"
          :teams="boardTeams"
          :show-dice="!team?.reachedGoal"
          :dice-value="diceFace"
          :dice-tooltip="diceTooltip"
          :dice-interactive="diceInteractive"
          :dice-loading="diceLoadingBoard"
          :roll-prompt="canRollNext ? rollPromptPhrase : null"
          :field-activity-letters="showDevSimulation ? devFieldActivityLetters : {}"
          :dev-field-pickable="showDevSimulation && canRollNext"
          :dev-pickable-fields="devPickableFields"
          @dice-click="onDiceClick"
          @dev-field-pick="rollAtField"
        />
        <p
          v-if="showDevSimulation"
          class="pixel-body text-center text-[9px] opacity-70"
        >
          {{ $t('play.devPickFieldHint') }}
          <span class="block mt-0.5">{{ $t('play.devActivityLegend') }}</span>
        </p>
        <PixelRollDiceOverlay
          :visible="rollSequence === 'dice'"
          :value="overlayDiceValue"
        />
      </div>
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


      <section
        v-else-if="turn && turn.state === 'scanned' && isCoopTask"
        class="pixel-card space-y-4 p-4"
      >
        <p class="pixel-title text-xs">
          {{
            coopRole === 'partner'
              ? $t('play.coopPartnerTitle')
              : $t('play.coopInitiatorTitle')
          }}
        </p>
        <p class="pixel-body text-sm whitespace-pre-wrap">{{ coopTaskText }}</p>
        <PixelButton :disabled="loading" @click="completeCoop">
          {{ $t('play.coopDone') }}
        </PixelButton>
      </section>

      <section
        v-else-if="turn && turn.state === 'scanned' && isMediaTask && mediaPayload"
        class="space-y-4"
      >
        <MediaTaskUpload
          :turn-id="turn.id"
          :payload="mediaPayload"
          :client-transcode="clientTranscodePolicy"
          :disabled="loading"
          @uploaded="onMediaUploaded"
        />
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

      <section v-else-if="turn && turn.state === 'awaiting_coop'" class="pixel-card space-y-4 p-4 text-center">
        <p class="pixel-title text-xs">{{ $t('play.coop') }}</p>
        <p class="pixel-body text-sm">{{ $t('play.coopScanPartnerQr', { bonus: coopBonusPoints }) }}</p>
        <PixelButton
          :disabled="loading"
          @click="openCoopBonusScanner()"
        >
          {{ $t('play.coopScanTeamQrBonus') }}
        </PixelButton>
        <PixelButton
          :disabled="loading"
          @click="continuePlayingCoop"
        >
          {{ $t('play.continuePlayingWaitCoop') }}
        </PixelButton>
        <PixelButton
          v-if="canReroll"
          variant="secondary"
          :disabled="loading"
          @click="abandonTurn"
        >
          {{ $t('play.rollAgain') }}
        </PixelButton>
      </section>

      <section v-else-if="turn && turn.state === 'awaiting_crew' && isMediaTask" class="pixel-card space-y-4 p-4 text-center">
        <p class="pixel-title text-xs">{{ $t('play.media.title') }}</p>
        <p class="pixel-body text-sm whitespace-pre-wrap">{{ mediaTaskText }}</p>
        <p class="pixel-body text-sm opacity-80">{{ $t('play.media.waitingForCrew') }}</p>
        <PixelButton
          :disabled="loading"
          @click="continuePlaying"
        >
          {{ $t('play.continuePlayingWaitCrew') }}
        </PixelButton>
        <PixelButton
          v-if="canReroll"
          variant="secondary"
          :disabled="loading"
          @click="abandonTurn"
        >
          {{ $t('play.rollAgain') }}
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
          :disabled="loading"
          @click="continuePlaying"
        >
          {{ $t('play.continuePlayingWaitCrew') }}
        </PixelButton>
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
        <PixelButton
          variant="secondary"
          @click="showMenu = false; showPwaInstall = true"
        >
          {{ $t('common.installApp') }}
        </PixelButton>
        <PixelButton
          v-if="showDevSimulation"
          variant="secondary"
          @click="showMenu = false; triggerDevPreview()"
        >
          {{ $t('play.goalCelebration.previewDev') }}
        </PixelButton>
        <PixelButton
          v-if="showDevSimulation"
          variant="secondary"
          @click="logoutDev()"
        >
          {{ $t('play.logoutDev') }}
        </PixelButton>
      </div>
    </PixelDialog>

    <PixelDialog
      :open="showSeekingModal && turn?.state === 'rolled'"
      :title="seekingDialogTitle"
      :dismissible="false"
      scrollable
      panel-class="seeking-card !p-4"
    >
      <div v-if="turn?.state === 'rolled'" class="space-y-4">
        <div class="seeking-card__action space-y-4 text-center">
          <p class="pixel-body text-base seeking-card__hint-vague text-left">
            <span class="seeking-card__hint-label">{{ $t('play.hintLabel') }}</span>
            {{ taskHintVague }}
          </p>
          <PixelButton :disabled="loading || rollAnimating" @click="showScanner = true">
            {{ $t('play.scanQr') }}
          </PixelButton>
        </div>

        <div class="seeking-card__hints space-y-3">
          <p class="pixel-title text-[10px] opacity-80">{{ $t('play.hintsSection') }}</p>
          <p v-if="hintVisible(1)" class="pixel-body text-sm seeking-card__hint-line">
            {{ taskHintLevel1 }}
          </p>
          <p v-if="hintVisible(2)" class="pixel-body text-sm seeking-card__hint-line">
            {{ taskHintLevel2 }}
          </p>
          <p v-if="hintVisible(3) && !hasFestivalMap" class="pixel-body text-sm seeking-card__hint-line">
            {{ $t('hints.mapUnavailable') }}
          </p>
          <PixelButton
            v-if="hintVisible(3) && hasFestivalMap"
            variant="secondary"
            class="w-full"
            @click="showFestivalMapFullscreen = true"
          >
            {{ $t('hints.openMap') }}
          </PixelButton>
          <div v-if="showHintBar && edition" class="seeking-card__hint-controls">
            <PixelHintBar
              embedded
              :turn="turn"
              :hint-costs="edition.config.hintCosts"
              :disabled="loading"
              :now="now"
              @show-now="(level: 1 | 2 | 3) => useHint(level)"
              @show-all="useHint(undefined, 'reveal_all')"
            />
          </div>
        </div>

        <button
          v-if="canReroll"
          type="button"
          class="seeking-card__roll-again w-full"
          :disabled="loading"
          @click="abandonTurn"
        >
          {{ $t('play.rollAgain') }}
        </button>
      </div>
    </PixelDialog>

    <PwaInstallDialog
      :open="showPwaInstall"
      role="player"
      @close="showPwaInstall = false"
    />

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
        v-if="hintVisible(3) && hasFestivalMap"
        variant="secondary"
        class="mt-3 w-full"
        @click="showFestivalMapFullscreen = true"
      >
        {{ $t('hints.openMap') }}
      </PixelButton>
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
      :crew-confirmed-field="turnScoreSummary?.crewConfirmedField ?? null"
      @close="closeTurnScoreSummary"
    />

    <PixelGoalCelebration
      :open="celebrationOpen"
      :score-total="team?.scoreTotal ?? 0"
      @close="closeCelebration"
      @open-leaderboard="closeCelebration(); showLeaderboard = true"
    />

    <PixelDialog
      :open="showCoopBonusScanner"
      :title="$t('play.coopScanTeamQrBonus')"
      panel-class="!p-3"
      @close="showCoopBonusScanner = false; coopLinkDepotId = null"
    >
      <TaskQrScanner
        v-if="showCoopBonusScanner"
        embedded
        mode="team"
        @scanned="onCoopTeamQrScanned"
        @close="showCoopBonusScanner = false; coopLinkDepotId = null"
      />
    </PixelDialog>

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
  font-size: 8px;
  line-height: 1.5;
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
