import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { getDb } from '../../utils/db'
import { adminUsers } from '../../database/schema'
import { setAdminSession } from '../../utils/admin-session'

const schema = z.object({
  secret: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = schema.parse(await readBody(event))
  if (body.secret !== config.adminInitSecret) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid init secret' })
  }

  const db = getDb()
  const existing = await db.select().from(adminUsers).limit(1)
  if (existing[0]) {
    throw createError({ statusCode: 409, statusMessage: 'Admin already initialized' })
  }

  const now = new Date()
  const inserted = await db
    .insert(adminUsers)
    .values({
      email: body.email,
      passwordHash: await bcrypt.hash(body.password, 10),
      createdAt: now,
    })
    .returning()

  await setAdminSession(event, inserted[0]!.id)
  return { ok: true, email: body.email }
})
