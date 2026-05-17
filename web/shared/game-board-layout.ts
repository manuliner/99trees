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

  const pathD = nodes
    .map((n, idx) => `${idx === 0 ? 'M' : 'L'} ${n.x} ${n.y}`)
    .join(' ')

  return { nodes, width, height, pathD }
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
