import { and, eq } from 'drizzle-orm'
import { getDb } from '../utils/db'
import { stations, turns } from '../database/schema'
import { getEditionOrThrow, getOpenTurn } from './game'
import { assertEditionLive } from '../utils/edition-live'
import { logGameEvent } from '../utils/logger'

export async function applyStationScan(params: {
  teamId: number
  editionId: number
  turnId: number
  stationSlug: string
  token: string
}) {
  const { teamId, editionId, turnId, stationSlug, token } = params
  const open = await getOpenTurn(teamId)
  if (!open || open.id !== turnId || open.state !== 'rolled') {
    throw createError({ statusCode: 400, statusMessage: 'Scan not allowed now' })
  }

  const edition = await getEditionOrThrow(editionId)
  assertEditionLive(edition.status, 'scan')
  const db = getDb()
  const stationRows = await db
    .select()
    .from(stations)
    .where(and(eq(stations.slug, stationSlug), eq(stations.editionId, edition.id)))
    .limit(1)
  const station = stationRows[0]
  if (!station || station.qrToken !== token) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid station QR' })
  }
  if (station.fieldNumber !== open.positionPending) {
    throw createError({
      statusCode: 400,
      statusMessage: `Wrong station — you need field ${open.positionPending}`,
    })
  }

  const now = new Date()
  const nextState = station.taskType === 'performance' ? 'awaiting_crew' : 'scanned'

  await db
    .update(turns)
    .set({ state: nextState, stationId: station.id, scannedAt: now })
    .where(eq(turns.id, turnId))

  logGameEvent('turn.scan', {
    teamId,
    turnId,
    field: station.fieldNumber,
    taskType: station.taskType,
  })

  return {
    taskType: station.taskType,
    taskPayload: JSON.parse(station.taskPayloadJson),
    fieldNumber: station.fieldNumber,
  }
}
