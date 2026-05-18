import { eq } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { teams, turns } from '../../database/schema'
import { requireTeam, parseCompletedFields } from '../../utils/team-session'
import { resolvePendingPosition, splitMovePathByCompleted } from '#shared/game-board-layout'
import {
  appendTeamOverflowFields,
  getEditionOrThrow,
  getExcludedPendingFromAbandons,
  getOpenTurn,
  pickDiceForRoll,
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
  const { playedFields, overflowFields } = splitMovePathByCompleted(
    from,
    pending,
    completed,
  )
  const now = new Date()

  const db = getDb()
  const inserted = await db
    .insert(turns)
    .values({
      teamId: team.id,
      state: 'rolled',
      diceValue: dice,
      positionFrom: from,
      positionPending: pending,
      pathPlayedFieldsJson: JSON.stringify(playedFields),
      pathOverflowFieldsJson: JSON.stringify(overflowFields),
      rolledAt: now,
      createdAt: now,
    })
    .returning()

  const task = await getTaskForField(edition.id, pending)
  const boardHighlights = await appendTeamOverflowFields(team.id, overflowFields, completed)

  logGameEvent('turn.roll', {
    teamId: team.id,
    turnId: inserted[0]!.id,
    dice,
    pending,
    excludedPendingCount: excludedPending.size,
  })

  return {
    turnId: inserted[0]!.id,
    dice,
    positionFrom: from,
    positionPending: pending,
    playedFields,
    overflowFields,
    boardHighlights,
    task: task
      ? { fieldNumber: task.fieldNumber, hintVague: parseHintColumn(task.hintVague) }
      : null,
  }
})
