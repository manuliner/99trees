import { describe, expect, it } from 'vitest'
import {
  fieldsConsumingSteps,
  resolvePendingPosition,
  splitMovePathByCompleted,
} from './game-board-layout'

describe('resolvePendingPosition', () => {
  it('skips completed fields when consuming dice steps', () => {
    expect(resolvePendingPosition(7, 3, [8, 9, 10, 11, 12], 30)).toBe(15)
  })
})

describe('fieldsConsumingSteps', () => {
  it('returns only fields where a step was consumed', () => {
    expect(fieldsConsumingSteps(7, 3, [8, 9, 10, 11, 12], 30)).toEqual([13, 14, 15])
  })
})

describe('splitMovePathByCompleted', () => {
  it('puts solved stations on the path in playedFields', () => {
    const { playedFields, overflowFields } = splitMovePathByCompleted(
      7,
      15,
      [8, 9, 10, 11, 12],
    )
    expect(playedFields).toEqual([8, 9, 10, 11, 12])
    expect(overflowFields).toEqual([13, 14])
  })

  it('puts only skipped cells in overflowFields', () => {
    const { playedFields, overflowFields } = splitMovePathByCompleted(2, 5, [3])
    expect(playedFields).toEqual([3])
    expect(overflowFields).toEqual([4])
  })

  it('excludes the target field from both lists', () => {
    const { playedFields, overflowFields } = splitMovePathByCompleted(2, 5, [])
    expect(playedFields).toEqual([])
    expect(overflowFields).toEqual([3, 4])
    expect(overflowFields).not.toContain(5)
  })
})
