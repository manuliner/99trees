import { requireTeam, parseCompletedFields } from '../../utils/team-session'
import { resolvePendingPosition } from '#shared/game-board-layout'
import {
  appendTeamOverflowFields,
  assertCanStartNewRoll,
  createRolledTurn,
  getEditionOrThrow,
  getExcludedPendingFromAbandons,
  pickDiceForRoll,
} from '../../services/game'
import { parseEditionConfig } from '../../utils/edition-config'

export default defineEventHandler(async (event) => {
  const team = await requireTeam(event)
  const edition = await getEditionOrThrow(team.editionId)
  if (edition.status !== 'live') {
    throw createError({ statusCode: 403, statusMessage: 'Game is not live' })
  }

  await assertCanStartNewRoll(team.id)

  const config = parseEditionConfig(edition.configJson)
  const completed = parseCompletedFields(team.completedFieldsJson)
  const excludedPending = await getExcludedPendingFromAbandons(team.id, team.positionConfirmed)
  const dice = pickDiceForRoll(
    config,
    team.positionConfirmed,
    completed,
    edition.fieldCount,
    excludedPending,
  )
  const from = team.positionConfirmed
  const pending = resolvePendingPosition(from, dice, completed, edition.fieldCount)

  const result = await createRolledTurn(team, edition, pending, dice, completed)

  logGameEvent('turn.roll', {
    teamId: team.id,
    turnId: result.turnId,
    dice,
    pending,
    excludedPendingCount: excludedPending.size,
  })

  return result
})
