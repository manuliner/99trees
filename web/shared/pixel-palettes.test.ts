import { describe, expect, it } from 'vitest'
import {
  DEFAULT_EDITION_COLOR_PALETTE,
  EDITION_COLOR_PALETTES,
  resolveEditionColorPalette,
} from './pixel-palettes'

describe('resolveEditionColorPalette', () => {
  it('returns each known palette id', () => {
    for (const id of EDITION_COLOR_PALETTES) {
      expect(resolveEditionColorPalette(id)).toBe(id)
    }
  })

  it('falls back to default for invalid input', () => {
    expect(resolveEditionColorPalette(undefined)).toBe(DEFAULT_EDITION_COLOR_PALETTE)
    expect(resolveEditionColorPalette(null)).toBe(DEFAULT_EDITION_COLOR_PALETTE)
    expect(resolveEditionColorPalette('neon')).toBe(DEFAULT_EDITION_COLOR_PALETTE)
    expect(resolveEditionColorPalette(42)).toBe(DEFAULT_EDITION_COLOR_PALETTE)
  })
})
