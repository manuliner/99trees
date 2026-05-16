import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { requireTeam } from '../../utils/team-session'
import { getDb } from '../../utils/db'
import { teams } from '../../database/schema'
import { eq } from 'drizzle-orm'

const schema = z.object({
  pin: z.string().regex(/^\d{4}$/),
  currentPin: z.string().regex(/^\d{4}$/).optional(),
})

export default defineEventHandler(async (event) => {
  const team = await requireTeam(event)
  const body = schema.parse(await readBody(event))
  const db = getDb()

  if (body.currentPin) {
    const ok = await bcrypt.compare(body.currentPin, team.pinHash)
    if (!ok) throw createError({ statusCode: 401, statusMessage: 'Current PIN incorrect' })
  }

  await db
    .update(teams)
    .set({ pinHash: await bcrypt.hash(body.pin, 10) })
    .where(eq(teams.id, team.id))

  return { ok: true }
})
