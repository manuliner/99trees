import type { EditionConfig } from '#shared/types'
import { DEFAULT_EDITION_CONFIG } from '#shared/types'

export function parseEditionConfig(json: string): EditionConfig {
  try {
    const parsed = JSON.parse(json) as Partial<EditionConfig>
    return {
      ...DEFAULT_EDITION_CONFIG,
      ...parsed,
      hintTimerMinutes: parsed.hintTimerMinutes ?? DEFAULT_EDITION_CONFIG.hintTimerMinutes,
      hintCosts: { ...DEFAULT_EDITION_CONFIG.hintCosts, ...parsed.hintCosts },
    }
  }
  catch {
    return DEFAULT_EDITION_CONFIG
  }
}
