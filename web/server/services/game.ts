import { and, desc, eq, inArray } from 'drizzle-orm'
import { parseEditionSlug } from '#shared/edition-urls'
import { parseHintColumn } from '../utils/admin-task'
import { getDb } from '../utils/db'
import { editions, tasks, teams, turns } from '../database/schema'
import { parseEditionConfig } from '../utils/edition-config'
import {
  parseCompletedFields,
  serializeCompletedFields,
} from '../utils/team-session'
import { calculateTurnScoreBreakdown, type TurnScoreInput } from '#shared/scoring'
import { teamQrPath } from '#shared/edition-urls'
import { activityPayloadForTeam, parseActivityPayload } from '#shared/quiz-payload'
import type { EditionConfig, TurnState } from '#shared/types'
import { assertEditionLive } from '../utils/edition-live'
import { isDevSimulationEnabled } from '../utils/dev-only'

export async function getEditionOrThrow(editionId: number) {
  const db = getDb()
  const rows = await db.select().from(editions).where(eq(editions.id, editionId)).limit(1)
  const edition = rows[0]
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })
  return edition
}

export async function getEditionBySlugOrThrow(rawSlug: string) {
  const slug = parseEditionSlug(rawSlug)
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Invalid edition slug' })
  const db = getDb()
  const rows = await db.select().from(editions).where(eq(editions.slug, slug)).limit(1)
  const edition = rows[0]
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })
  return edition
}

export function publicEditionPayload(edition: typeof editions.$inferSelect) {
  return {
    id: edition.id,
    slug: edition.slug,
    name: edition.name,
    status: edition.status,
    fieldCount: edition.fieldCount,
    startsAt: edition.startsAt,
    endsAt: edition.endsAt,
  }
}

export async function getOpenTurn(teamId: number) {
  const db = getDb()
  const activeStates: TurnState[] = ['rolled', 'scanned', 'awaiting_crew', 'completed']
  const rows = await db
    .select()
    .from(turns)
    .where(eq(turns.teamId, teamId))
    .orderBy(desc(turns.id))
    .limit(5)
  return (
    rows.find(
      (t) =>
        activeStates.includes(t.state as TurnState)
        && t.confirmedAt == null
        && t.state !== 'abandoned',
    ) ?? null
  )
}

export function rollDice(config: EditionConfig): number {
  const min = config.diceMin
  const max = config.diceMax
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** Advance `steps` fields forward, skipping already completed field numbers. */
export function resolvePendingPosition(
  from: number,
  steps: number,
  completed: number[],
  fieldCount: number,
): number {
  const completedSet = new Set(completed)
  let pos = from
  let remaining = steps
  while (remaining > 0 && pos < fieldCount) {
    pos += 1
    if (!completedSet.has(pos)) remaining -= 1
  }
  return Math.min(pos, fieldCount)
}

export async function getTaskForField(editionId: number, fieldNumber: number) {
  const db = getDb()
  const rows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.editionId, editionId), eq(tasks.fieldNumber, fieldNumber)))
    .limit(1)
  return rows[0] ?? null
}

/** @deprecated Use getTaskForField */
export const getStationForField = getTaskForField

export async function deductHintCost(teamId: number, turnId: number, newTotalHintCost: number) {
  const db = getDb()
  const turn = (await db.select().from(turns).where(eq(turns.id, turnId)).limit(1))[0]
  if (!turn || turn.teamId !== teamId) return 0

  const already = turn.hintPointsDeducted ?? 0
  const delta = Math.max(0, newTotalHintCost - already)
  if (delta === 0) return 0

  const team = (await db.select().from(teams).where(eq(teams.id, teamId)).limit(1))[0]
  if (!team) return 0

  await db
    .update(teams)
    .set({ scoreTotal: Math.max(0, team.scoreTotal - delta) })
    .where(eq(teams.id, teamId))
  await db
    .update(turns)
    .set({ hintPointsDeducted: already + delta })
    .where(eq(turns.id, turnId))

  return delta
}

export function parseHintsUsed(json: string): number[] {
  try {
    return JSON.parse(json) as number[]
  }
  catch {
    return []
  }
}

export async function buildMePayload(teamId: number) {
  const db = getDb()
  const team = (await db.select().from(teams).where(eq(teams.id, teamId)).limit(1))[0]
  if (!team) throw createError({ statusCode: 404, statusMessage: 'Team not found' })

  const edition = await getEditionOrThrow(team.editionId)
  const config = parseEditionConfig(edition.configJson)
  const openTurn = await getOpenTurn(team.id)

  let turnPayload = null
  if (openTurn) {
    const hintsUsed = parseHintsUsed(openTurn.hintsUsedJson)
    const task =
      openTurn.taskId != null
        ? (await db.select().from(tasks).where(eq(tasks.id, openTurn.taskId)).limit(1))[0]
        : await getTaskForField(edition.id, openTurn.positionPending)

    const now = Date.now()
    const rolledAt = openTurn.rolledAt?.getTime() ?? now
    const hintUnlockAt = config.hintTimerMinutes.map((m) => rolledAt + m * 60_000)

    turnPayload = {
      id: openTurn.id,
      state: openTurn.state,
      diceValue: openTurn.diceValue,
      positionPending: openTurn.positionPending,
      hintMode: openTurn.hintMode,
      hintsUsed,
      hintUnlockAt,
      canRevealAll: openTurn.state === 'rolled',
      canRollAgain: false,
      task: task
        ? {
            fieldNumber: task.fieldNumber,
            hintVague: parseHintColumn(task.hintVague),
            hintLevel1: parseHintColumn(task.hintLevel1),
            hintLevel2: parseHintColumn(task.hintLevel2),
            mapX: task.mapX,
            mapY: task.mapY,
            activityType: task.activityType,
            activityPayload: activityPayloadForTeam(
              parseActivityPayload(JSON.parse(task.activityPayloadJson)),
            ),
          }
        : null,
    }

    if (openTurn.state === 'rolled') {
      const allHintsAvailable =
        openTurn.hintMode === 'reveal_all' || now >= hintUnlockAt[2]!
      turnPayload.canRollAgain = allHintsAvailable
    }
  }

  const completedFields = parseCompletedFields(team.completedFieldsJson)
  const mapPins: { fieldNumber: number; mapX: number; mapY: number; kind: 'visited' | 'target' }[] = []

  if (completedFields.length > 0) {
    const visitedTasks = await db
      .select({
        fieldNumber: tasks.fieldNumber,
        mapX: tasks.mapX,
        mapY: tasks.mapY,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.editionId, edition.id),
          inArray(tasks.fieldNumber, completedFields),
        ),
      )
    for (const t of visitedTasks) {
      mapPins.push({
        fieldNumber: t.fieldNumber,
        mapX: t.mapX,
        mapY: t.mapY,
        kind: 'visited',
      })
    }
  }

  if (openTurn?.state === 'rolled' && turnPayload?.task) {
    const hintsUsed = parseHintsUsed(openTurn.hintsUsedJson)
    const hint3Visible =
      hintsUsed.includes(3) || openTurn.hintMode === 'reveal_all'
    if (hint3Visible) {
      const tk = turnPayload.task
      if (!mapPins.some((p) => p.fieldNumber === tk.fieldNumber && p.kind === 'target')) {
        mapPins.push({
          fieldNumber: tk.fieldNumber,
          mapX: tk.mapX,
          mapY: tk.mapY,
          kind: 'target',
        })
      }
    }
  }

  return {
    devSimulation: isDevSimulationEnabled(),
    team: {
      id: team.id,
      name: team.name,
      slug: team.slug,
      editionId: team.editionId,
      positionConfirmed: team.positionConfirmed,
      scoreTotal: team.scoreTotal,
      reachedGoal: team.reachedGoalAt != null,
      completedFields,
      teamQrPath: teamQrPath(team.editionId, team.slug, team.teamQrToken),
    },
    edition: {
      id: edition.id,
      slug: edition.slug,
      name: edition.name,
      status: edition.status,
      fieldCount: edition.fieldCount,
      config,
      mapImageUrl: edition.mapImagePath ?? null,
    },
    mapPins,
    openTurn: turnPayload,
  }
}

function buildTurnScoreInput(
  turn: {
    hintMode: string | null
    hintsUsedJson: string
    quizWrongAttempts: number
    bonusPoints: number
    scannedAt: Date | null
    hintPointsDeducted: number
  },
  config: EditionConfig,
  confirmedAtMs: number,
): TurnScoreInput {
  return {
    config,
    hintMode: (turn.hintMode as 'wait' | 'reveal_all') ?? null,
    hintsUsedLevels: parseHintsUsed(turn.hintsUsedJson),
    quizWrongAttempts: turn.quizWrongAttempts,
    bonusPoints: turn.bonusPoints,
    scannedAtMs: turn.scannedAt?.getTime() ?? null,
    confirmedAtMs: confirmedAtMs,
    hintsAlreadyDeducted: turn.hintPointsDeducted ?? 0,
  }
}

export async function getTurnScoreSummary(teamId: number, turnId: number) {
  const db = getDb()
  const team = (await db.select().from(teams).where(eq(teams.id, teamId)).limit(1))[0]
  if (!team) throw createError({ statusCode: 404, statusMessage: 'Team not found' })

  const turn = (await db.select().from(turns).where(eq(turns.id, turnId)).limit(1))[0]
  if (!turn || turn.teamId !== teamId) throw createError({ statusCode: 404, statusMessage: 'Turn not found' })
  if (!turn.confirmedAt) {
    throw createError({ statusCode: 400, statusMessage: 'Turn not confirmed yet' })
  }

  const edition = await getEditionOrThrow(team.editionId)
  const config = parseEditionConfig(edition.configJson)
  const breakdown = calculateTurnScoreBreakdown(
    buildTurnScoreInput(turn, config, turn.confirmedAt.getTime()),
  )

  return {
    breakdown,
    newScore: team.scoreTotal,
    scoreDelta: turn.scoreDelta ?? breakdown.total,
  }
}

export async function confirmTurn(teamId: number, turnId: number) {
  const db = getDb()
  const team = (await db.select().from(teams).where(eq(teams.id, teamId)).limit(1))[0]
  if (!team) throw createError({ statusCode: 404, statusMessage: 'Team not found' })

  const turn = (await db.select().from(turns).where(eq(turns.id, turnId)).limit(1))[0]
  if (!turn || turn.teamId !== teamId) throw createError({ statusCode: 404, statusMessage: 'Turn not found' })
  if (turn.state !== 'completed') {
    throw createError({ statusCode: 400, statusMessage: 'Task not completed yet' })
  }

  const edition = await getEditionOrThrow(team.editionId)
  assertEditionLive(edition.status, 'confirm turn')
  const config = parseEditionConfig(edition.configJson)
  const confirmedAt = new Date()

  const breakdown = calculateTurnScoreBreakdown(
    buildTurnScoreInput(turn, config, confirmedAt.getTime()),
  )
  const scoreDelta = breakdown.total

  const newPosition = turn.positionPending
  const completed = parseCompletedFields(team.completedFieldsJson)
  if (!completed.includes(newPosition)) completed.push(newPosition)

  const newScore = team.scoreTotal + scoreDelta
  const reachedGoal = newPosition >= edition.fieldCount
  const reachedGoalAt = reachedGoal && !team.reachedGoalAt ? confirmedAt : team.reachedGoalAt

  await db
    .update(turns)
    .set({ scoreDelta, confirmedAt, state: 'completed' })
    .where(eq(turns.id, turnId))

  await db
    .update(teams)
    .set({
      positionConfirmed: newPosition,
      scoreTotal: newScore,
      completedFieldsJson: serializeCompletedFields(completed),
      reachedGoalAt,
    })
    .where(eq(teams.id, teamId))

  return { scoreDelta, breakdown, newPosition, newScore, reachedGoal }
}
