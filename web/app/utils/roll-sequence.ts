import { boardFieldsBetween } from '#shared/game-board-layout'

export const ROLL_DICE_MS = 1200
export const ROLL_MOVE_MS_PER_FIELD = 500
export const ROLL_MOVE_MIN_MS = 500
export const ROLL_MOVE_MAX_MS = 7500

export function prefersReducedMotion(): boolean {
  if (!import.meta.client) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function moveStepMs(pathLength: number): number {
  if (pathLength <= 0) return 0
  const total = Math.min(
    ROLL_MOVE_MAX_MS,
    Math.max(ROLL_MOVE_MIN_MS, pathLength * ROLL_MOVE_MS_PER_FIELD),
  )
  return total / pathLength
}

export function movePathFields(from: number, to: number): number[] {
  return boardFieldsBetween(from, to)
}
