import type { EditionConfig } from './types'

export interface TurnScoreInput {
  config: EditionConfig
  hintMode: 'wait' | 'reveal_all' | null
  hintsUsedLevels: number[]
  quizWrongAttempts: number
  bonusPoints: number
  scannedAtMs: number | null
  confirmedAtMs: number
  abandoned?: boolean
  /** Hint costs already subtracted from team score_total during the turn */
  hintsAlreadyDeducted?: number
}

export function timeBonusFromScan(config: EditionConfig, scannedAtMs: number, confirmedAtMs: number): number {
  const seconds = Math.max(0, Math.floor((confirmedAtMs - scannedAtMs) / 1000))
  return Math.max(0, 50 - Math.floor(seconds / 60) * 5)
}

export function hintPenalty(config: EditionConfig, hintMode: 'wait' | 'reveal_all' | null, levels: number[]): number {
  if (hintMode === 'reveal_all') return config.hintCosts.revealAll
  let total = 0
  for (const level of levels) {
    const cost = config.hintCosts.wait[level - 1]
    if (cost) total += cost
  }
  return total
}

export function calculateTurnScore(input: TurnScoreInput): number {
  if (input.abandoned) return 0

  const base = 100
  const time =
    input.scannedAtMs != null
      ? timeBonusFromScan(input.config, input.scannedAtMs, input.confirmedAtMs)
      : 0
  const hints =
    hintPenalty(input.config, input.hintMode, input.hintsUsedLevels)
    - (input.hintsAlreadyDeducted ?? 0)
  const quiz = input.quizWrongAttempts * 5

  return base + time + input.bonusPoints - hints - quiz
}
