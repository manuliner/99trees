import { describe, expect, it } from 'vitest'
import { overflowJsonAfterAbandon } from './board-overflow'

describe('overflowJsonAfterAbandon', () => {
  it('restores snapshot from before roll', () => {
    expect(
      overflowJsonAfterAbandon('[4, 5, 6]', '[5, 6]', '[4]'),
    ).toBe('[4]')
  })

  it('falls back to subtracting path overflow when snapshot missing', () => {
    expect(
      overflowJsonAfterAbandon('[4, 5, 6]', '[5, 6]', null),
    ).toBe('[4]')
  })

  it('restores empty overflow when roll started with none', () => {
    expect(
      overflowJsonAfterAbandon('[5, 6]', '[5, 6]', '[]'),
    ).toBe('[]')
  })
})
