import { and, desc, eq, like } from 'drizzle-orm'
import { getDb } from '../utils/db'
import { crewRatings, stations, teams, turns } from '../database/schema'
import { getEditionOrThrow } from './game'

export async function searchTeams(editionId: number, q: string) {
  const db = getDb()
  const pattern = `%${q.trim()}%`
  return db
    .select({ id: teams.id, name: teams.name, positionConfirmed: teams.positionConfirmed })
    .from(teams)
    .where(and(eq(teams.editionId, editionId), like(teams.name, pattern)))
    .limit(20)
}

export async function resolveTeamQr(editionId: number, slug: string, token: string) {
  const db = getDb()
  const rows = await db
    .select()
    .from(teams)
    .where(and(eq(teams.editionId, editionId), eq(teams.slug, slug), eq(teams.teamQrToken, token)))
    .limit(1)
  return rows[0] ?? null
}

export async function getCrewTeamDetail(editionId: number, teamId: number) {
  const db = getDb()
  const team = (
    await db
      .select()
      .from(teams)
      .where(and(eq(teams.id, teamId), eq(teams.editionId, editionId)))
      .limit(1)
  )[0]
  if (!team) throw createError({ statusCode: 404, statusMessage: 'Team not found' })

  const openTurn = (
    await db
      .select()
      .from(turns)
      .where(eq(turns.teamId, teamId))
      .orderBy(desc(turns.id))
      .limit(1)
  )[0]

  let currentTurn = null
  if (openTurn && ['awaiting_crew', 'scanned', 'rolled', 'completed'].includes(openTurn.state)) {
    const station = openTurn.stationId
      ? (await db.select().from(stations).where(eq(stations.id, openTurn.stationId)).limit(1))[0]
      : null
    currentTurn = {
      id: openTurn.id,
      state: openTurn.state,
      positionPending: openTurn.positionPending,
      taskType: station?.taskType,
      taskPayload: station ? JSON.parse(station.taskPayloadJson) : null,
      stationName: station?.slug,
      fieldNumber: station?.fieldNumber,
    }
  }

  return { team: { id: team.id, name: team.name, positionConfirmed: team.positionConfirmed }, currentTurn }
}

export async function ratePerformanceTurn(
  editionId: number,
  teamId: number,
  turnId: number,
  rating: 'ok' | 'bonus',
) {
  const db = getDb()
  await getEditionOrThrow(editionId)

  const turn = (await db.select().from(turns).where(eq(turns.id, turnId)).limit(1))[0]
  if (!turn || turn.teamId !== teamId) {
    throw createError({ statusCode: 404, statusMessage: 'Turn not found' })
  }
  if (turn.state !== 'awaiting_crew') {
    throw createError({ statusCode: 400, statusMessage: 'Team is not awaiting crew rating' })
  }

  const existing = await db.select().from(crewRatings).where(eq(crewRatings.turnId, turnId)).limit(1)
  if (existing[0]) {
    throw createError({ statusCode: 409, statusMessage: 'Already rated' })
  }

  const bonusPoints = rating === 'bonus' ? 25 : 0
  const now = new Date()

  await db.insert(crewRatings).values({ turnId, rating, createdAt: now })
  await db
    .update(turns)
    .set({ state: 'completed', completedAt: now, bonusPoints })
    .where(eq(turns.id, turnId))

  return { ok: true, bonusPoints }
}

export async function getPendingPerformances(editionId: number) {
  const db = getDb()
  const rows = await db
    .select({
      turnId: turns.id,
      teamId: teams.id,
      teamName: teams.name,
      fieldNumber: stations.fieldNumber,
      slug: stations.slug,
      scannedAt: turns.scannedAt,
    })
    .from(turns)
    .innerJoin(teams, eq(turns.teamId, teams.id))
    .leftJoin(stations, eq(turns.stationId, stations.id))
    .where(and(eq(teams.editionId, editionId), eq(turns.state, 'awaiting_crew')))
    .orderBy(turns.scannedAt)

  return rows.map((r) => ({
    turnId: r.turnId,
    teamId: r.teamId,
    teamName: r.teamName,
    fieldNumber: r.fieldNumber,
    stationSlug: r.slug,
    waitingSince: r.scannedAt?.toISOString(),
  }))
}

export async function resetTeamPin(editionId: number, teamId: number) {
  const bcrypt = await import('bcryptjs')
  const db = getDb()
  const team = (
    await db
      .select()
      .from(teams)
      .where(and(eq(teams.id, teamId), eq(teams.editionId, editionId)))
      .limit(1)
  )[0]
  if (!team) throw createError({ statusCode: 404, statusMessage: 'Team not found' })

  const tempPin = String(Math.floor(1000 + Math.random() * 9000))
  const pinHash = await bcrypt.hash(tempPin, 10)
  await db.update(teams).set({ pinHash }).where(eq(teams.id, teamId))
  return { tempPin, teamName: team.name }
}
