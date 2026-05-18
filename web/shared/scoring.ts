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

export interface TurnScoreBreakdown {
  base: number
  timeBonus: number
  crewBonus: number
  hintsDuringTurn: number
  hintsAtConfirm: number
  quizPenalty: number
  total: number
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

function scoreParts(input: TurnScoreInput): TurnScoreBreakdown {
  if (input.abandoned) {
    return {
      base: 0,
      timeBonus: 0,
      crewBonus: 0,
      hintsDuringTurn: input.hintsAlreadyDeducted ?? 0,
      hintsAtConfirm: 0,
      quizPenalty: 0,
      total: 0,
    }
  }

  const base = 100
  const timeBonus =
    input.scannedAtMs != null
      ? timeBonusFromScan(input.config, input.scannedAtMs, input.confirmedAtMs)
      : 0
  const crewBonus = input.bonusPoints
  const hintsDuringTurn = input.hintsAlreadyDeducted ?? 0
  const hintsAtConfirm =
    hintPenalty(input.config, input.hintMode, input.hintsUsedLevels) - hintsDuringTurn
  const quizPenalty = input.quizWrongAttempts * 5
  const total = base + timeBonus + crewBonus - hintsAtConfirm - quizPenalty

  return { base, timeBonus, crewBonus, hintsDuringTurn, hintsAtConfirm, quizPenalty, total }
}

export function calculateTurnScoreBreakdown(input: TurnScoreInput): TurnScoreBreakdown {
  return scoreParts(input)
}

export function calculateTurnScore(input: TurnScoreInput): number {
  return scoreParts(input).total
}
