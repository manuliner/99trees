import { eq } from 'drizzle-orm'
import { normalizeQuizInputMode, parseActivityPayload } from '#shared/quiz-payload'
import { resolveLocalizedList } from '#shared/localized'
import { getDb } from '../../../../utils/db'
import { tasks } from '../../../../database/schema'
import { requireTeam } from '../../../../utils/team-session'
import { assertDevOnly } from '../../../../utils/dev-only'
import { getActivePlayTurn } from '../../../../services/game'

export default defineEventHandler(async (event) => {
  assertDevOnly()
  const team = await requireTeam(event)
  const turnId = Number(getRouterParam(event, 'id'))
  const open = await getActivePlayTurn(team.id)
  if (!open || open.id !== turnId || open.state !== 'scanned') {
    throw createError({ statusCode: 400, statusMessage: 'No quiz task active' })
  }

  const db = getDb()
  const task = open.taskId
    ? (await db.select().from(tasks).where(eq(tasks.id, open.taskId)).limit(1))[0]
    : null
  if (!task || task.activityType !== 'quiz') {
    throw createError({ statusCode: 400, statusMessage: 'Task not found' })
  }

  const payload = parseActivityPayload(JSON.parse(task.activityPayloadJson))
  if (payload.type !== 'quiz') {
    throw createError({ statusCode: 400, statusMessage: 'Task not found' })
  }
  normalizeQuizInputMode(payload)

  const answer = resolveLocalizedList(payload.answers, 'de')[0]
  if (!answer?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'No correct answer configured' })
  }

  return { answer }
})
