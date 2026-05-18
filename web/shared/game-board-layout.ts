/** Pixel layout for serpentine game board (field 0 at top, goal N at bottom). */

export const GAME_BOARD_NODE_SIZE = 44
export const GAME_BOARD_GAP = 20
export const GAME_BOARD_PADDING = 24
export const GAME_BOARD_COLS = 5

export type BoardNode = {
  field: number
  x: number
  y: number
  row: number
  col: number
}

export type BoardLayout = {
  nodes: BoardNode[]
  width: number
  height: number
  pathD: string
}

function cellStep(): number {
  return GAME_BOARD_NODE_SIZE + GAME_BOARD_GAP
}

/** Axis-aligned track between node centers (horizontal, then vertical). */
export function buildOrthogonalPathD(nodes: BoardNode[]): string {
  if (nodes.length === 0) return ''
  const first = nodes[0]!
  let d = `M ${first.x} ${first.y}`
  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1]!
    const curr = nodes[i]!
    if (prev.x !== curr.x) {
      d += ` L ${curr.x} ${prev.y}`
    }
    if (prev.y !== curr.y) {
      d += ` L ${curr.x} ${curr.y}`
    }
  }
  return d
}

/** Fields 0…fieldCount inclusive (start + N stations). */
export function computeGameBoardLayout(
  fieldCount: number,
  cols = GAME_BOARD_COLS,
): BoardLayout {
  const totalNodes = fieldCount + 1
  const totalRows = Math.ceil(totalNodes / cols)
  const step = cellStep()
  const nodes: BoardNode[] = []

  for (let i = 0; i < totalNodes; i++) {
    const rowFromTop = Math.floor(i / cols)
    const posInRow = i % cols
    const col =
      rowFromTop % 2 === 0
        ? posInRow
        : cols - 1 - posInRow

    const x = GAME_BOARD_PADDING + col * step + GAME_BOARD_NODE_SIZE / 2
    const y = GAME_BOARD_PADDING + rowFromTop * step + GAME_BOARD_NODE_SIZE / 2

    nodes.push({ field: i, x, y, row: rowFromTop, col })
  }

  const width =
    GAME_BOARD_PADDING * 2 + (cols - 1) * step + GAME_BOARD_NODE_SIZE
  const height =
    GAME_BOARD_PADDING * 2 + (totalRows - 1) * step + GAME_BOARD_NODE_SIZE

  const pathD = buildOrthogonalPathD(nodes)

  return { nodes, width, height, pathD }
}

/** Inclusive field numbers traveled when moving from `from` to `to` on the board. */
export function boardFieldsBetween(from: number, to: number): number[] {
  if (to <= from) return []
  const path: number[] = []
  for (let f = from + 1; f <= to; f++) path.push(f)
  return path
}

/** Advance `steps` fields forward, skipping already completed field numbers. */
export function resolvePendingPosition(
  from: number,
  steps: number,
  completed: readonly number[],
  fieldCount: number,
): number {
  const completedSet = new Set(completed)
  let pos = from
  let remaining = steps
  while (remaining > 0 && pos < fieldCount) {
    pos += 1
    if (!completedSet.has(pos)) remaining -= 1
  }
  return Math.min(pos, fieldCount)
}

/** Fields where a dice step was consumed (same loop as resolvePendingPosition). */
export function fieldsConsumingSteps(
  from: number,
  dice: number,
  completed: readonly number[],
  fieldCount: number,
): number[] {
  const completedSet = new Set(completed)
  const stepped: number[] = []
  let pos = from
  let remaining = dice
  while (remaining > 0 && pos < fieldCount) {
    pos += 1
    if (!completedSet.has(pos)) {
      remaining -= 1
      stepped.push(pos)
    }
  }
  return stepped
}

/**
 * Path highlight split for UI:
 * - playedFields: stations with a solved task (completed), on the path
 * - overflowFields: path cells only skipped (no solved task there yet), excludes target
 */
export function splitMovePathByCompleted(
  from: number,
  to: number,
  completed: readonly number[],
): { playedFields: number[]; overflowFields: number[] } {
  const completedSet = new Set(completed)
  const playedFields: number[] = []
  const overflowFields: number[] = []
  for (const field of boardFieldsBetween(from, to)) {
    if (field === to) continue
    if (completedSet.has(field)) playedFields.push(field)
    else overflowFields.push(field)
  }
  return { playedFields, overflowFields }
}

/** Active field to keep centered in the viewport. */
export function activeBoardField(
  positionConfirmed: number,
  positionPending?: number | null,
): number {
  if (
    positionPending != null
    && positionPending > positionConfirmed
  ) {
    return positionPending
  }
  return positionConfirmed
}
