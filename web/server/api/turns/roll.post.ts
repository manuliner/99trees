import { eq } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { teams, turns } from '../../database/schema'
import { requireTeam, parseCompletedFields } from '../../utils/team-session'
import {
  getEditionOrThrow,
  getOpenTurn,
  rollDice,
  resolvePendingPosition,
  getTaskForField,
} from '../../services/game'
import { parseEditionConfig } from '../../utils/edition-config'
import { parseHintColumn } from '../../utils/admin-task'

export default defineEventHandler(async (event) => {
  const team = await requireTeam(event)
  const edition = await getEditionOrThrow(team.editionId)
  if (edition.status !== 'live') {
    throw createError({ statusCode: 403, statusMessage: 'Game is not live' })
  }

  const open = await getOpenTurn(team.id)
  if (open) {
    throw createError({ statusCode: 409, statusMessage: 'Finish or abandon current turn first' })
  }

  const config = parseEditionConfig(edition.configJson)
  const dice = rollDice(config)
  const completed = parseCompletedFields(team.completedFieldsJson)
  const pending = resolvePendingPosition(team.positionConfirmed, dice, completed, edition.fieldCount)
  const now = new Date()

  const db = getDb()
  const inserted = await db
    .insert(turns)
    .values({
      teamId: team.id,
      state: 'rolled',
      diceValue: dice,
      positionFrom: team.positionConfirmed,
      positionPending: pending,
      rolledAt: now,
      createdAt: now,
    })
    .returning()

  const task = await getTaskForField(edition.id, pending)

  logGameEvent('turn.roll', { teamId: team.id, turnId: inserted[0]!.id, dice, pending })

  return {
    turnId: inserted[0]!.id,
    dice,
    positionPending: pending,
    task: task
      ? { fieldNumber: task.fieldNumber, hintVague: parseHintColumn(task.hintVague) }
      : null,
  }
})
