import { requireTeam, parseCompletedFields } from '../../../utils/team-session'
import { assertDevOnly } from '../../../utils/dev-only'
import { parseEditionConfig } from '../../../utils/edition-config'
import { devRollSchema } from '#shared/schemas'
import {
  assertCanStartNewRoll,
  createRolledTurn,
  getEditionOrThrow,
  getTaskForField,
  pickDiceForTargetField,
} from '../../../services/game'

export default defineEventHandler(async (event) => {
  assertDevOnly()
  const team = await requireTeam(event)
  if (team.reachedGoalAt != null) {
    throw createError({ statusCode: 403, statusMessage: 'Team has reached the goal' })
  }

  const body = devRollSchema.parse(await readBody(event))
  const edition = await getEditionOrThrow(team.editionId)

  if (body.targetField >= edition.fieldCount) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid target field' })
  }

  const task = await getTaskForField(edition.id, body.targetField)
  if (!task) {
    throw createError({ statusCode: 400, statusMessage: 'No task for target field' })
  }

  await assertCanStartNewRoll(team.id)

  const config = parseEditionConfig(edition.configJson)
  const completed = parseCompletedFields(team.completedFieldsJson)
  const from = team.positionConfirmed
  const pending = body.targetField
  const dice = pickDiceForTargetField(
    config,
    from,
    pending,
    completed,
    edition.fieldCount,
  )

  const result = await createRolledTurn(team, edition, pending, dice, completed)

  logGameEvent('turn.roll.dev', {
    teamId: team.id,
    turnId: result.turnId,
    dice,
    pending,
    targetField: body.targetField,
  })

  return result
})
