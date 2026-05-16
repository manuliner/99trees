import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../../../utils/db'
import { stations, turns } from '../../../database/schema'
import { requireTeam } from '../../../utils/team-session'
import { getEditionOrThrow, getOpenTurn } from '../../../services/game'
import { assertEditionLive } from '../../../utils/edition-live'
import { logGameEvent } from '../../../utils/logger'

const scanSchema = z.object({
  stationSlug: z.string().min(1),
  token: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const team = await requireTeam(event)
  const turnId = Number(getRouterParam(event, 'id'))
  const body = scanSchema.parse(await readBody(event))
  const open = await getOpenTurn(team.id)
  if (!open || open.id !== turnId || open.state !== 'rolled') {
    throw createError({ statusCode: 400, statusMessage: 'Scan not allowed now' })
  }

  const edition = await getEditionOrThrow(team.editionId)
  assertEditionLive(edition.status, 'scan')
  const db = getDb()
  const stationRows = await db
    .select()
    .from(stations)
    .where(eq(stations.slug, body.stationSlug))
    .limit(1)
  const station = stationRows[0]
  if (!station || station.editionId !== edition.id || station.qrToken !== body.token) {
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
    teamId: team.id,
    turnId,
    field: station.fieldNumber,
    taskType: station.taskType,
  })

  return {
    taskType: station.taskType,
    taskPayload: JSON.parse(station.taskPayloadJson),
    fieldNumber: station.fieldNumber,
  }
})
