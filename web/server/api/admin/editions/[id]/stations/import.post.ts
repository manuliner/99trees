import { eq } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { getDb } from '../../../../../utils/db'
import { editions, stations } from '../../../../../database/schema'
import { requireAdmin } from '../../../../../utils/admin-session'

const stationSchema = z.object({
  field: z.number().int().positive(),
  slug: z.string().min(1),
  hint_vague: z.string().min(1),
  hint_medium: z.string().optional(),
  hint_level_1: z.string().optional(),
  hint_level_2: z.string().optional(),
  map: z.object({ x: z.number(), y: z.number() }).optional(),
  task: z.object({
    type: z.enum(['quiz', 'performance']),
    question: z.string().optional(),
    answers: z.array(z.string()).optional(),
    text: z.string().optional(),
  }),
})

const importSchema = z.object({
  stations: z.array(stationSchema).min(1),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const editionId = Number(getRouterParam(event, 'id'))
  const body = importSchema.parse(await readBody(event))
  const db = getDb()

  await db.delete(stations).where(eq(stations.editionId, editionId))

  const maxField = Math.max(...body.stations.map((s) => s.field))
  for (const s of body.stations) {
    const payload =
      s.task.type === 'quiz'
        ? { type: 'quiz', question: s.task.question ?? '', answers: s.task.answers ?? [] }
        : { type: 'performance', text: s.task.text ?? '' }

    await db.insert(stations).values({
      editionId,
      fieldNumber: s.field,
      slug: s.slug,
      hintVague: s.hint_vague,
      hintLevel1: s.hint_level_1 ?? s.hint_medium ?? s.hint_vague,
      hintLevel2: s.hint_level_2 ?? s.hint_medium ?? s.hint_vague,
      mapX: s.map?.x ?? s.field * 10,
      mapY: s.map?.y ?? 50,
      qrToken: randomBytes(8).toString('hex'),
      taskType: s.task.type,
      taskPayloadJson: JSON.stringify(payload),
    })
  }

  await db
    .update(editions)
    .set({ fieldCount: maxField })
    .where(eq(editions.id, editionId))

  return { imported: body.stations.length, fieldCount: maxField }
})
