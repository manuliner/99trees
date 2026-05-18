import type { EditionStatus } from '#shared/types'

const TEAM_NAME_MIN = 3
const TEAM_NAME_MAX = 32

export function trimTeamName(name: string): string {
  return name.trim()
}

export function validateTeamName(name: string): string | null {
  const trimmed = trimTeamName(name)
  if (trimmed.length < TEAM_NAME_MIN) {
    return 'teamName.tooShort'
  }
  if (trimmed.length > TEAM_NAME_MAX) {
    return 'teamName.tooLong'
  }
  return null
}

export function canRegisterEdition(status: EditionStatus | string | undefined): boolean {
  return status === 'live'
}

export function editionStatusMessage(status: EditionStatus | string | undefined): string | null {
  switch (status) {
    case 'draft':
      return 'editionStatus.draft'
    case 'paused':
      return 'editionStatus.paused'
    case 'ended':
      return 'editionStatus.ended'
    case 'live':
      return null
    default:
      return status ? 'editionStatus.unknown' : null
  }
}

export { TEAM_NAME_MIN, TEAM_NAME_MAX }
