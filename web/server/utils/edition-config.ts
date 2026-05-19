import type { EditionConfig } from '#shared/types'
import { DEFAULT_EDITION_CONFIG, resolveClientTranscodePolicy } from '#shared/types'
import { resolveEditionColorPalette } from '#shared/pixel-palettes'

export function parseEditionConfig(json: string): EditionConfig {
  try {
    const parsed = JSON.parse(json) as Partial<EditionConfig>
    return {
      ...DEFAULT_EDITION_CONFIG,
      ...parsed,
      hintTimerMinutes: parsed.hintTimerMinutes ?? DEFAULT_EDITION_CONFIG.hintTimerMinutes,
      hintCosts: { ...DEFAULT_EDITION_CONFIG.hintCosts, ...parsed.hintCosts },
      clientTranscode: resolveClientTranscodePolicy(parsed.clientTranscode),
      colorPalette: resolveEditionColorPalette(parsed.colorPalette),
    }
  }
  catch {
    return DEFAULT_EDITION_CONFIG
  }
}
