import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../../utils/db'
import { adminUsers } from '../../database/schema'
import { setAdminSession } from '../../utils/admin-session'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const body = schema.parse(await readBody(event))
  const db = getDb()
  const admin = (await db.select().from(adminUsers).where(eq(adminUsers.email, body.email)).limit(1))[0]
  if (!admin || !(await bcrypt.compare(body.password, admin.passwordHash))) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }
  await setAdminSession(event, admin.id)
  return { ok: true, email: admin.email }
})
