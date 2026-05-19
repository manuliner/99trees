export const TEAM_AVATAR_BIRD_IDS = [
  'stork',
  'goose',
  'crane',
  'swallow',
  'owl',
  'eagle',
  'robin',
  'bluetit',
  'hummingbird',
  'penguin',
  'flamingo',
  'parrot',
  'raven',
  'woodpecker',
  'duck',
  'falcon',
  'seagull',
  'peacock',
  'cockatoo',
  'pelican',
  'hoopoe',
  'starling',
  'blackbird',
  'wagtail',
  'bullfinch',
  'green_woodpecker',
  'peregrine',
  'grebe',
  'cormorant',
  'crow',
] as const

export const TEAM_AVATAR_MEME_IDS = [
  'nyan_cat',
  'pepe',
  'doge',
  'grumpy_cat',
  'success_kid',
  'distracted_boyfriend',
] as const

export const TEAM_AVATAR_IDS = [
  ...TEAM_AVATAR_BIRD_IDS,
  ...TEAM_AVATAR_MEME_IDS,
] as const

export type TeamAvatarId = (typeof TEAM_AVATAR_IDS)[number]

export function isTeamAvatarId(value: string): value is TeamAvatarId {
  return (TEAM_AVATAR_IDS as readonly string[]).includes(value)
}

export function teamAvatarImagePath(id: TeamAvatarId): string {
  return `/avatars/${id}.png`
}

/** Fallback label when i18n key is missing. */
export function teamAvatarFallbackLabel(id: string): string {
  return id.replace(/_/g, ' ')
}

/** CSS token per avatar — fallback if image fails to load. */
export const TEAM_AVATAR_PLACEHOLDER: Record<
  TeamAvatarId,
  { emoji: string; color: string }
> = {
  stork: { emoji: '🦩', color: '#e8a0bf' },
  goose: { emoji: '🪿', color: '#c8d4e8' },
  crane: { emoji: '🕊️', color: '#a8d8ea' },
  swallow: { emoji: '🐦', color: '#7ec8e3' },
  owl: { emoji: '🦉', color: '#c4a882' },
  eagle: { emoji: '🦅', color: '#d4a574' },
  robin: { emoji: '🐦', color: '#c45c4a' },
  bluetit: { emoji: '🐦', color: '#4a9fd4' },
  hummingbird: { emoji: '🐦', color: '#3cb878' },
  penguin: { emoji: '🐧', color: '#2a2a2a' },
  flamingo: { emoji: '🦩', color: '#f5a8c8' },
  parrot: { emoji: '🦜', color: '#2ecc71' },
  raven: { emoji: '🐦‍⬛', color: '#3d3d3d' },
  woodpecker: { emoji: '🐦', color: '#c0392b' },
  duck: { emoji: '🦆', color: '#8b7355' },
  falcon: { emoji: '🦅', color: '#8b6914' },
  seagull: { emoji: '🕊️', color: '#d0d8e8' },
  peacock: { emoji: '🦚', color: '#1a6b8a' },
  cockatoo: { emoji: '🦜', color: '#f0e6d0' },
  pelican: { emoji: '🐦', color: '#e8dcc8' },
  hoopoe: { emoji: '🐦', color: '#c47a2c' },
  starling: { emoji: '🐦', color: '#2c2c3a' },
  blackbird: { emoji: '🐦', color: '#1a1c2c' },
  wagtail: { emoji: '🐦', color: '#9aa5b8' },
  bullfinch: { emoji: '🐦', color: '#e74c3c' },
  green_woodpecker: { emoji: '🐦', color: '#27ae60' },
  peregrine: { emoji: '🦅', color: '#5d4e37' },
  grebe: { emoji: '🐦', color: '#1a1c2c' },
  cormorant: { emoji: '🐦', color: '#2c3e50' },
  crow: { emoji: '🐦‍⬛', color: '#1a1c2c' },
  nyan_cat: { emoji: '🐱', color: '#b8c8e8' },
  pepe: { emoji: '🐸', color: '#6abf69' },
  doge: { emoji: '🐕', color: '#e8c49a' },
  grumpy_cat: { emoji: '😾', color: '#c8b8a8' },
  success_kid: { emoji: '👶', color: '#7ec8e3' },
  distracted_boyfriend: { emoji: '👀', color: '#e4e9f7' },
}
