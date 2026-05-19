import { and, eq, isNull, ne } from 'drizzle-orm'
import type { getDb } from './db'
import { coopDepots, teams, turns } from '../database/schema'
import { parsePathFieldsJson, revertTeamOverflowAfterAbandon } from '../services/game'
import { parseCompletedFields, serializeCompletedFields } from './team-session'

type Db = ReturnType<typeof getDb>

function fieldsBelow(fields: readonly number[], maxExclusive: number): number[] {
  return fields.filter((field) => field < maxExclusive)
}

export async function assertCanEditBoardFields(
  edition: { status: string },
): Promise<void> {
  if (edition.status === 'draft' || edition.status === 'paused' || edition.status === 'live') {
    return
  }

  throw createError({
    statusCode: 400,
    statusMessage: 'Board fields can only be changed while the edition is draft, paused, or live',
  })
}

/** After removing the highest field number, fix team progress and abandon in-flight turns there. */
export async function reconcileEditionAfterFieldRemoved(
  db: Db,
  editionId: number,
  removedField: number,
): Promise<{ abandonedTurns: number }> {
  const newFieldCount = removedField - 1

  await db
    .delete(coopDepots)
    .where(
      and(eq(coopDepots.editionId, editionId), eq(coopDepots.fieldNumber, removedField)),
    )

  const openTurnRows = await db
    .select()
    .from(turns)
    .innerJoin(teams, eq(turns.teamId, teams.id))
    .where(
      and(
        eq(teams.editionId, editionId),
        eq(turns.positionPending, removedField),
        isNull(turns.confirmedAt),
        ne(turns.state, 'abandoned'),
      ),
    )

  const now = new Date()
  for (const { turns: turn } of openTurnRows) {
    await db
      .update(turns)
      .set({ state: 'abandoned', scoreDelta: 0, confirmedAt: now, taskId: null })
      .where(eq(turns.id, turn.id))
    await revertTeamOverflowAfterAbandon(turn.teamId, turn)
  }

  const teamRows = await db.select().from(teams).where(eq(teams.editionId, editionId))
  for (const team of teamRows) {
    const completed = fieldsBelow(parseCompletedFields(team.completedFieldsJson), removedField)
    const overflow = fieldsBelow(parsePathFieldsJson(team.overflowFieldsJson), removedField)
    const position = Math.min(team.positionConfirmed, newFieldCount)
    const reachedGoal = newFieldCount > 0 && position >= newFieldCount

    await db
      .update(teams)
      .set({
        positionConfirmed: position,
        completedFieldsJson: serializeCompletedFields(completed),
        overflowFieldsJson: JSON.stringify(overflow),
        reachedGoalAt: reachedGoal ? (team.reachedGoalAt ?? now) : null,
      })
      .where(eq(teams.id, team.id))
  }

  return { abandonedTurns: openTurnRows.length }
}
