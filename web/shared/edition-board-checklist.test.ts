import { describe, expect, it } from 'vitest'
import { analyzeEditionBoard } from './edition-board-checklist'

describe('analyzeEditionBoard', () => {
  it('passes when trailing board slots are empty', () => {
    const fields = Array.from({ length: 50 }, (_, i) => i + 1)
    const result = analyzeEditionBoard(fields, 51)
    expect(result.issues).toEqual([])
    expect(result.trailingEmptySlots).toBe(1)
    expect(result.effectiveFieldCount).toBe(50)
  })

  it('flags gaps in the station sequence', () => {
    const fields = [1, 2, 4]
    const result = analyzeEditionBoard(fields, 4)
    expect(result.issues).toContain('Missing task for field 3')
  })

  it('flags no tasks', () => {
    expect(analyzeEditionBoard([], 5).issues).toContain('No tasks imported')
  })
})
