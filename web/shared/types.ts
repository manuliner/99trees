import type { LocalizedString, LocalizedStringList } from './localized'
import type { EditionColorPalette } from './pixel-palettes'
import { DEFAULT_EDITION_COLOR_PALETTE } from './pixel-palettes'

export type { EditionColorPalette } from './pixel-palettes'

export type EditionStatus = 'draft' | 'live' | 'paused' | 'ended'

/** Upper bound for stations per edition (branding cap — not literal field_count). */
export const MAX_EDITION_FIELD_COUNT = 99

export type TurnState =
  | 'rolled'
  | 'scanned'
  | 'awaiting_crew'
  | 'awaiting_crew_bg'
  | 'awaiting_coop'
  | 'awaiting_coop_bg'
  | 'completed'
  | 'abandoned'

export const PENDING_CREW_TURN_STATES = ['awaiting_crew', 'awaiting_crew_bg'] as const
export type PendingCrewTurnState = (typeof PENDING_CREW_TURN_STATES)[number]

export const PENDING_COOP_TURN_STATES = ['awaiting_coop', 'awaiting_coop_bg'] as const
export type PendingCoopTurnState = (typeof PENDING_COOP_TURN_STATES)[number]

export type CoopDepotState = 'awaiting_partner' | 'completed' | 'cancelled'

export type PendingCoopItemRole = 'depot_open' | 'bonus_pending'

export interface PendingCoopItem {
  depotId: number
  fieldNumber: number
  role: PendingCoopItemRole
  partnerTeamName: string | null
  turnId: number | null
}

export type HintMode = 'wait' | 'reveal_all'

export interface ClientTranscodePolicy {
  photo: boolean
  video: boolean
  audio: boolean
}

export const DEFAULT_CLIENT_TRANSCODE: ClientTranscodePolicy = {
  photo: true,
  video: true,
  audio: false,
}

/** Merge edition / API partial policy with product defaults (undefined ≠ transcode off). */
export function resolveClientTranscodePolicy(
  partial?: Partial<ClientTranscodePolicy> | null,
): ClientTranscodePolicy {
  return {
    ...DEFAULT_CLIENT_TRANSCODE,
    ...(partial ?? {}),
  }
}


export interface MediaUploadPolicy {
  clientTranscode: ClientTranscodePolicy
}

export interface EditionConfig {
  diceMin: number
  diceMax: number
  hintTimerMinutes: [number, number, number]
  hintCosts: { wait: [number, number, number]; revealAll: number }
  performanceTimeoutMinutes: number
  coopBonusPoints: number
  clientTranscode?: ClientTranscodePolicy
  colorPalette?: EditionColorPalette
}

export const DEFAULT_EDITION_CONFIG: EditionConfig = {
  diceMin: 1,
  diceMax: 6,
  hintTimerMinutes: [3, 6, 9],
  hintCosts: { wait: [10, 12, 15], revealAll: 50 },
  performanceTimeoutMinutes: 10,
  coopBonusPoints: 25,
  clientTranscode: { ...DEFAULT_CLIENT_TRANSCODE },
  colorPalette: DEFAULT_EDITION_COLOR_PALETTE,
}

export function cloneEditionConfig(config: EditionConfig): EditionConfig {
  return {
    diceMin: config.diceMin,
    diceMax: config.diceMax,
    hintTimerMinutes: [...config.hintTimerMinutes] as EditionConfig['hintTimerMinutes'],
    hintCosts: {
      wait: [...config.hintCosts.wait] as EditionConfig['hintCosts']['wait'],
      revealAll: config.hintCosts.revealAll,
    },
    performanceTimeoutMinutes: config.performanceTimeoutMinutes,
    coopBonusPoints: config.coopBonusPoints,
    clientTranscode: resolveClientTranscodePolicy(config.clientTranscode),
    colorPalette: config.colorPalette ?? DEFAULT_EDITION_COLOR_PALETTE,
  }
}

export type QuizInputMode = 'freeText' | 'multipleChoice'

export interface QuizActivityPayload {
  type: 'quiz'
  question: LocalizedString
  inputMode?: QuizInputMode
  choices?: LocalizedStringList
  answers: LocalizedStringList
}

/** Quiz payload exposed to teams (correct answers stripped). */
export type TeamQuizActivityPayload = Pick<
  QuizActivityPayload,
  'type' | 'question' | 'inputMode' | 'choices'
>

export interface PerformanceActivityPayload {
  type: 'performance'
  text: LocalizedString
}

export interface CoopActivityPayload {
  type: 'coop'
  instructions: LocalizedString
  partnerInstructions: LocalizedString
}

export type MediaKind = 'photo' | 'video' | 'audio'

export interface MediaActivityPayload {
  type: 'media'
  text: LocalizedString
  allowedKinds: MediaKind[]
  maxDurationSec?: number
}

export type ActivityPayload =
  | QuizActivityPayload
  | PerformanceActivityPayload
  | CoopActivityPayload
  | MediaActivityPayload

export type CoopTurnRole = 'initiator' | 'partner'

export interface AdminTask {
  id: number
  fieldNumber: number
  slug: string
  hintVague: LocalizedString
  hintLevel1: LocalizedString
  hintLevel2: LocalizedString
  mapX: number
  mapY: number
  activityType: 'quiz' | 'performance' | 'coop' | 'media'
  activityPayload: ActivityPayload
}

export type PendingApprovalKind = 'performance' | 'media'

export interface PendingApprovalAction {
  id: string
  label: string
  variant?: 'primary' | 'secondary' | 'danger'
}

export interface PendingApproval {
  turnId: number
  teamId: number
  teamName: string
  fieldNumber: number | null
  taskSlug: string | null
  waitingSince: string | null
  kind: PendingApprovalKind
  summary: string
  actions: PendingApprovalAction[]
  previewUrl?: string | null
  mediaKind?: MediaKind | null
}

export const PERFORMANCE_APPROVAL_ACTIONS: PendingApprovalAction[] = [
  { id: 'ok', label: 'OK', variant: 'primary' },
  { id: 'bonus', label: 'Bonus (+25)', variant: 'secondary' },
]

export const MEDIA_APPROVAL_ACTIONS: PendingApprovalAction[] = PERFORMANCE_APPROVAL_ACTIONS

export interface AdminTeamListItem {
  id: number
  name: string
  slug: string
  positionConfirmed: number
  positionPending: number | null
  scoreTotal: number
  completedCount: number
  reachedGoal: boolean
  openTurnState: TurnState | null
  openTurnField: number | null
}
