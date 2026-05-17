import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../../../../utils/db'
import { teams } from '../../../../database/schema'
import { requireAdmin } from '../../../../utils/admin-session'
import { parseBody } from '../../../../utils/parse-body'

const schema = z.object({
  pin: z.string().regex(/^\d{4}$/),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const teamId = Number(getRouterParam(event, 'id'))
  const body = parseBody(schema, await readBody(event))
  const db = getDb()

  const team = (await db.select().from(teams).where(eq(teams.id, teamId)).limit(1))[0]
  if (!team) throw createError({ statusCode: 404, statusMessage: 'Team not found' })

  await db
    .update(teams)
    .set({ pinHash: await bcrypt.hash(body.pin, 10) })
    .where(eq(teams.id, teamId))

  return { ok: true }
})
