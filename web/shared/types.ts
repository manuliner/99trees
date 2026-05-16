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

export interface QuizTaskPayload {
  type: 'quiz'
  question: string
  answers: string[]
}

export interface PerformanceTaskPayload {
  type: 'performance'
  text: string
}
