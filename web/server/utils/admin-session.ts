import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { getDb } from './db'
import { adminUsers } from '../database/schema'

const ADMIN_ROLE = 'admin' as const

export async function setAdminSession(event: H3Event, adminId: number) {
  const db = getDb()
  const admin = (await db.select().from(adminUsers).where(eq(adminUsers.id, adminId)).limit(1))[0]
  if (!admin) {
    throw createError({ statusCode: 404, statusMessage: 'Admin not found' })
  }

  await setUserSession(event, {
    user: {
      id: admin.id,
      email: admin.email,
      role: ADMIN_ROLE,
    },
    loggedInAt: Date.now(),
  })
}

export async function getAdminFromSession(event: H3Event) {
  const session = await getUserSession(event)
  const user = session.user
  if (!user?.id || user.role !== ADMIN_ROLE) return null

  const db = getDb()
  return (await db.select().from(adminUsers).where(eq(adminUsers.id, user.id)).limit(1))[0] ?? null
}

export async function requireAdmin(event: H3Event) {
  const admin = await getAdminFromSession(event)
  if (!admin) throw createError({ statusCode: 401, statusMessage: 'Admin session required' })
  return admin
}

export async function clearAdminSession(event: H3Event) {
  await clearUserSession(event)
}
