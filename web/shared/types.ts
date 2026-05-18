import type { LocalizedString, LocalizedStringList } from './localized'

export type EditionStatus = 'draft' | 'live' | 'paused' | 'ended'

export type TurnState = 'rolled' | 'scanned' | 'awaiting_crew' | 'completed' | 'abandoned'

export type HintMode = 'wait' | 'reveal_all'

export interface EditionConfig {
  diceMin: number
  diceMax: number
  hintTimerMinutes: [number, number, number]
  hintCosts: { wait: [number, number, number]; revealAll: number }
  performanceTimeoutMinutes: number
}

export const DEFAULT_EDITION_CONFIG: EditionConfig = {
  diceMin: 1,
  diceMax: 6,
  hintTimerMinutes: [3, 6, 9],
  hintCosts: { wait: [10, 12, 15], revealAll: 50 },
  performanceTimeoutMinutes: 10,
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

export type ActivityPayload = QuizActivityPayload | PerformanceActivityPayload

export interface AdminTask {
  id: number
  fieldNumber: number
  slug: string
  hintVague: LocalizedString
  hintLevel1: LocalizedString
  hintLevel2: LocalizedString
  mapX: number
  mapY: number
  activityType: 'quiz' | 'performance'
  activityPayload: ActivityPayload
}

export type PendingApprovalKind = 'performance'

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
}

export const PERFORMANCE_APPROVAL_ACTIONS: PendingApprovalAction[] = [
  { id: 'ok', label: 'OK', variant: 'primary' },
  { id: 'bonus', label: 'Bonus (+25)', variant: 'secondary' },
]

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
