import { eq } from 'drizzle-orm'
import { answerSchema } from '#shared/schemas'
import { getDb } from '../../../utils/db'
import { stations, turns } from '../../../database/schema'
import { requireTeam } from '../../../utils/team-session'
import { getOpenTurn } from '../../../services/game'
import type { QuizTaskPayload } from '#shared/types'

export default defineEventHandler(async (event) => {
  const team = await requireTeam(event)
  const turnId = Number(getRouterParam(event, 'id'))
  const body = answerSchema.parse(await readBody(event))
  const open = await getOpenTurn(team.id)
  if (!open || open.id !== turnId || open.state !== 'scanned') {
    throw createError({ statusCode: 400, statusMessage: 'No quiz task active' })
  }

  const db = getDb()
  const station = open.stationId
    ? (await db.select().from(stations).where(eq(stations.id, open.stationId)).limit(1))[0]
    : null
  if (!station) throw createError({ statusCode: 400, statusMessage: 'Station not found' })

  const payload = JSON.parse(station.taskPayloadJson) as QuizTaskPayload
  const normalized = body.answer.trim().toLowerCase()
  const correct = payload.answers.some((a) => a.trim().toLowerCase() === normalized)

  if (!correct) {
    await db
      .update(turns)
      .set({ quizWrongAttempts: open.quizWrongAttempts + 1 })
      .where(eq(turns.id, turnId))
    return { correct: false, penaltyPoints: 5 }
  }

  await db
    .update(turns)
    .set({ state: 'completed', completedAt: new Date() })
    .where(eq(turns.id, turnId))

  return { correct: true }
})
