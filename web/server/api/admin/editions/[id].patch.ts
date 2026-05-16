import { eq } from 'drizzle-orm'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { getDb } from '../../../utils/db'
import { editions } from '../../../database/schema'
import { requireAdmin } from '../../../utils/admin-session'

const schema = z.object({
  status: z.enum(['draft', 'live', 'paused', 'ended']).optional(),
  name: z.string().min(1).optional(),
  crewPassword: z.string().min(4).optional(),
  config: z.record(z.unknown()).optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = schema.parse(await readBody(event))
  const db = getDb()

  const patch: Record<string, unknown> = {}
  if (body.status) patch.status = body.status
  if (body.name) patch.name = body.name
  if (body.config) patch.configJson = JSON.stringify(body.config)
  if (body.crewPassword) patch.crewPasswordHash = await bcrypt.hash(body.crewPassword, 10)

  const updated = await db.update(editions).set(patch).where(eq(editions.id, id)).returning()
  if (!updated[0]) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })
  return { edition: updated[0] }
})
