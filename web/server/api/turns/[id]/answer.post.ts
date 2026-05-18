import { eq } from 'drizzle-orm'
import {
  isAnswerInChoices,
  isQuizAnswerCorrect,
  normalizeQuizInputMode,
  parseActivityPayload,
} from '#shared/quiz-payload'
import { answerSchema } from '#shared/schemas'
import { getDb } from '../../../utils/db'
import { tasks, turns } from '../../../database/schema'
import { requireTeam } from '../../../utils/team-session'
import { confirmTurn, getOpenTurn } from '../../../services/game'

export default defineEventHandler(async (event) => {
  const team = await requireTeam(event)
  const turnId = Number(getRouterParam(event, 'id'))
  const body = answerSchema.parse(await readBody(event))
  const open = await getOpenTurn(team.id)
  if (!open || open.id !== turnId || open.state !== 'scanned') {
    throw createError({ statusCode: 400, statusMessage: 'No quiz task active' })
  }

  const db = getDb()
  const task = open.taskId
    ? (await db.select().from(tasks).where(eq(tasks.id, open.taskId)).limit(1))[0]
    : null
  if (!task) throw createError({ statusCode: 400, statusMessage: 'Task not found' })

  const payload = parseActivityPayload(JSON.parse(task.activityPayloadJson))
  if (payload.type !== 'quiz') {
    throw createError({ statusCode: 400, statusMessage: 'No quiz task active' })
  }
  const inputMode = normalizeQuizInputMode(payload)

  if (inputMode === 'multipleChoice' && !isAnswerInChoices(payload, body.answer, body.locale)) {
    throw createError({ statusCode: 400, statusMessage: 'Answer is not a valid choice' })
  }

  const correct = isQuizAnswerCorrect(payload, body.answer, body.locale)

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

  const { scoreDelta, newScore, breakdown } = await confirmTurn(team.id, turnId)
  return { correct: true, scoreDelta, newScore, breakdown }
})
