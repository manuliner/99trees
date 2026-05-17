import { and, desc, eq, inArray } from 'drizzle-orm'
import { parseEditionSlug } from '#shared/edition-urls'
import { getDb } from '../utils/db'
import { editions, stations, teams, turns } from '../database/schema'
import { parseEditionConfig } from '../utils/edition-config'
import {
  parseCompletedFields,
  serializeCompletedFields,
} from '../utils/team-session'
import { calculateTurnScore } from '#shared/scoring'
import { teamQrPath } from '#shared/edition-urls'
import type { EditionConfig, TurnState } from '#shared/types'
import { assertEditionLive } from '../utils/edition-live'

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

export async function getStationForField(editionId: number, fieldNumber: number) {
  const db = getDb()
  const rows = await db
    .select()
    .from(stations)
    .where(and(eq(stations.editionId, editionId), eq(stations.fieldNumber, fieldNumber)))
    .limit(1)
  return rows[0] ?? null
}

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
    const station =
      openTurn.stationId != null
        ? (await db.select().from(stations).where(eq(stations.id, openTurn.stationId)).limit(1))[0]
        : await getStationForField(edition.id, openTurn.positionPending)

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
      station: station
        ? {
            fieldNumber: station.fieldNumber,
            hintVague: station.hintVague,
            hintLevel1: station.hintLevel1,
            hintLevel2: station.hintLevel2,
            mapX: station.mapX,
            mapY: station.mapY,
            taskType: station.taskType,
            taskPayload: JSON.parse(station.taskPayloadJson),
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
    const visitedStations = await db
      .select({
        fieldNumber: stations.fieldNumber,
        mapX: stations.mapX,
        mapY: stations.mapY,
      })
      .from(stations)
      .where(
        and(
          eq(stations.editionId, edition.id),
          inArray(stations.fieldNumber, completedFields),
        ),
      )
    for (const s of visitedStations) {
      mapPins.push({
        fieldNumber: s.fieldNumber,
        mapX: s.mapX,
        mapY: s.mapY,
        kind: 'visited',
      })
    }
  }

  if (openTurn?.state === 'rolled' && turnPayload?.station) {
    const hintsUsed = parseHintsUsed(openTurn.hintsUsedJson)
    const hint3Visible =
      hintsUsed.includes(3) || openTurn.hintMode === 'reveal_all'
    if (hint3Visible) {
      const st = turnPayload.station
      if (!mapPins.some((p) => p.fieldNumber === st.fieldNumber && p.kind === 'target')) {
        mapPins.push({
          fieldNumber: st.fieldNumber,
          mapX: st.mapX,
          mapY: st.mapY,
          kind: 'target',
        })
      }
    }
  }

  return {
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
  const scannedAt = turn.scannedAt?.getTime() ?? null
  const hintsUsed = parseHintsUsed(turn.hintsUsedJson)

  const scoreDelta = calculateTurnScore({
    config,
    hintMode: (turn.hintMode as 'wait' | 'reveal_all') ?? null,
    hintsUsedLevels: hintsUsed,
    quizWrongAttempts: turn.quizWrongAttempts,
    bonusPoints: turn.bonusPoints,
    scannedAtMs: scannedAt,
    confirmedAtMs: confirmedAt.getTime(),
    hintsAlreadyDeducted: turn.hintPointsDeducted ?? 0,
  })

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

  return { scoreDelta, newPosition, newScore, reachedGoal }
}
