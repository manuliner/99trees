export const EDITION_COLOR_PALETTES = ['zugvoegel', 'sunset', 'ocean', 'meadow', 'midnight'] as const

export type EditionColorPalette = (typeof EDITION_COLOR_PALETTES)[number]

export const DEFAULT_EDITION_COLOR_PALETTE: EditionColorPalette = 'zugvoegel'

/** Color tokens overridden per edition palette (`--pixel-border` / `--pixel-shadow` stay derived). */
export const PIXEL_PALETTE_VAR_NAMES = [
  '--pixel-sky-dawn',
  '--pixel-sky-warm',
  '--pixel-forest-dark',
  '--pixel-forest-mid',
  '--pixel-forest-light',
  '--pixel-sunrise',
  '--pixel-cream',
  '--pixel-score-plus',
  '--pixel-hint-highlight',
  '--pixel-score-minus',
  '--pixel-gold',
  '--pixel-board-path',
  '--pixel-board-start',
  '--pixel-board-pending',
  '--pixel-board-goal',
  '--pixel-board-done',
  '--pixel-board-done-text',
  '--pixel-board-played-path',
  '--pixel-board-played-path-text',
  '--pixel-board-overflow',
  '--pixel-board-overflow-text',
  '--pixel-board-future',
  '--pixel-board-future-text',
  '--pixel-board-focus',
  '--pixel-board-pending-crew',
  '--pixel-board-pending-crew-text',
  '--pixel-board-configured',
  '--pixel-board-configured-text',
  '--pixel-board-unconfigured',
  '--pixel-board-unconfigured-text',
  '--pixel-board-you',
  '--pixel-board-other',
  '--pixel-dice-face',
  '--pixel-dice-highlight',
  '--pixel-dice-shadow',
  '--pixel-dice-pip',
  '--pixel-dice-pip-accent',
  '--pixel-input-placeholder',
  '--pixel-input-bg',
] as const

export type PixelPaletteVarName = (typeof PIXEL_PALETTE_VAR_NAMES)[number]

export const EDITION_COLOR_PALETTE_LABELS: Record<EditionColorPalette, string> = {
  zugvoegel: 'Zugvögel',
  sunset: 'Sunset',
  ocean: 'Ocean',
  meadow: 'Meadow',
  midnight: 'Midnight',
}

/** Sky gradient stops for admin palette preview swatches (dawn, warm, forest-light). */
export const EDITION_COLOR_PALETTE_PREVIEW: Record<EditionColorPalette, readonly [string, string, string]> = {
  zugvoegel: ['#6b5b95', '#e8a87c', '#8fbc8f'],
  sunset: ['#8b3a62', '#f4a261', '#e9c46a'],
  ocean: ['#1a3a5c', '#4da8da', '#7ec8e3'],
  meadow: ['#4a6741', '#c9d48a', '#a7c957'],
  midnight: ['#2b1b4e', '#5c4d8a', '#7b6a9b'],
}

export function isEditionColorPalette(value: unknown): value is EditionColorPalette {
  return typeof value === 'string' && (EDITION_COLOR_PALETTES as readonly string[]).includes(value)
}

export function resolveEditionColorPalette(value: unknown): EditionColorPalette {
  return isEditionColorPalette(value) ? value : DEFAULT_EDITION_COLOR_PALETTE
}
