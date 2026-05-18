import { and, eq } from 'drizzle-orm'
import { activityPayloadForTeam, parseActivityPayload } from '#shared/quiz-payload'
import { getDb } from '../utils/db'
import { tasks, turns } from '../database/schema'
import { getEditionOrThrow, getOpenTurn } from './game'
import { assertEditionLive } from '../utils/edition-live'
import { logGameEvent } from '../utils/logger'

export async function applyTaskScan(params: {
  teamId: number
  editionId: number
  turnId: number
  taskSlug: string
  token: string
}) {
  const { teamId, editionId, turnId, taskSlug, token } = params
  const open = await getOpenTurn(teamId)
  if (!open || open.id !== turnId || open.state !== 'rolled') {
    throw createError({ statusCode: 400, statusMessage: 'Scan not allowed now' })
  }

  const edition = await getEditionOrThrow(editionId)
  assertEditionLive(edition.status, 'scan')
  const db = getDb()
  const taskRows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.slug, taskSlug), eq(tasks.editionId, edition.id)))
    .limit(1)
  const task = taskRows[0]
  if (!task || task.qrToken !== token) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid QR code' })
  }
  if (task.fieldNumber !== open.positionPending) {
    throw createError({
      statusCode: 400,
      statusMessage: `Wrong spot — you need field ${open.positionPending}`,
    })
  }

  const now = new Date()
  const nextState = task.activityType === 'performance' ? 'awaiting_crew' : 'scanned'

  await db
    .update(turns)
    .set({ state: nextState, taskId: task.id, scannedAt: now })
    .where(eq(turns.id, turnId))

  logGameEvent('turn.scan', {
    teamId,
    turnId,
    field: task.fieldNumber,
    activityType: task.activityType,
  })

  return {
    activityType: task.activityType,
    activityPayload: activityPayloadForTeam(
      parseActivityPayload(JSON.parse(task.activityPayloadJson)),
    ),
    fieldNumber: task.fieldNumber,
  }
}

/** @deprecated Use applyTaskScan */
export const applyStationScan = applyTaskScan
