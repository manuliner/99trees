import { requireTeam } from '../../../../utils/team-session'
import {
  completeCoopInitiator,
  completeCoopPartner,
  coopRoleForOpenTurn,
} from '../../../../services/coop'
import { getActivePlayTurn, getEditionOrThrow } from '../../../../services/game'
import { getDb } from '../../../../utils/db'
import { tasks } from '../../../../database/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const team = await requireTeam(event)
  const turnId = Number(getRouterParam(event, 'id'))
  const open = await getActivePlayTurn(team.id)
  if (!open || open.id !== turnId || open.state !== 'scanned') {
    throw createError({ statusCode: 400, statusMessage: 'No co-op task active' })
  }

  const db = getDb()
  const task = open.taskId
    ? (await db.select().from(tasks).where(eq(tasks.id, open.taskId)).limit(1))[0]
    : null
  if (!task || task.activityType !== 'coop') {
    throw createError({ statusCode: 400, statusMessage: 'No co-op task active' })
  }

  const edition = await getEditionOrThrow(team.editionId)
  const role = await coopRoleForOpenTurn(team.id, edition.id, task.fieldNumber)

  if (role === 'partner') {
    return completeCoopPartner(team.id, turnId)
  }
  return completeCoopInitiator(team.id, turnId)
})
