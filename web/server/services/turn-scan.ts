import { and, eq } from 'drizzle-orm'
import { activityPayloadForTeam, parseActivityPayload } from '#shared/quiz-payload'
import { getDb } from '../utils/db'
import { tasks, turns } from '../database/schema'
import { getEditionOrThrow, getActivePlayTurn } from './game'
import {
  assertTeamCanPlayCoopField,
  coopPayloadRole,
  getAwaitingPartnerDepot,
} from './coop'
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
  const open = await getActivePlayTurn(teamId)
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
  let nextState: 'scanned' | 'awaiting_crew' = 'scanned'
  let coopRole: ReturnType<typeof coopPayloadRole> | undefined

  if (task.activityType === 'performance') {
    nextState = 'awaiting_crew'
  }
  else if (task.activityType === 'coop') {
    await assertTeamCanPlayCoopField(teamId, task.fieldNumber)
    const depot = await getAwaitingPartnerDepot(edition.id, task.fieldNumber)
    coopRole = coopPayloadRole(teamId, task.fieldNumber, depot)
    if (coopRole === 'partner') {
      if (!depot) {
        throw createError({ statusCode: 400, statusMessage: 'No co-op depot on this field' })
      }
      if (depot.initiatorTeamId === teamId) {
        throw createError({ statusCode: 400, statusMessage: 'Cannot join your own co-op depot' })
      }
      if (depot.partnerTeamId != null) {
        throw createError({ statusCode: 409, statusMessage: 'Co-op depot already has a partner' })
      }
    }
    else if (depot) {
      throw createError({ statusCode: 409, statusMessage: 'Co-op depot already open on this field' })
    }
  }

  await db
    .update(turns)
    .set({ state: nextState, taskId: task.id, scannedAt: now })
    .where(eq(turns.id, turnId))

  logGameEvent('turn.scan', {
    teamId,
    turnId,
    field: task.fieldNumber,
    activityType: task.activityType,
    coopRole,
  })

  const payload = activityPayloadForTeam(
    parseActivityPayload(JSON.parse(task.activityPayloadJson)),
  )

  return {
    activityType: task.activityType,
    activityPayload: payload,
    fieldNumber: task.fieldNumber,
    coopRole,
  }
}

/** @deprecated Use applyTaskScan */
export const applyStationScan = applyTaskScan
