import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { getDb } from './db'
import { adminUsers } from '../database/schema'

const ADMIN_COOKIE = 'admin_session'

export async function setAdminSession(event: H3Event, adminId: number) {
  setCookie(event, ADMIN_COOKIE, String(adminId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24,
  })
}

export async function getAdminFromSession(event: H3Event) {
  const id = Number(getCookie(event, ADMIN_COOKIE))
  if (!Number.isFinite(id)) return null
  const db = getDb()
  return (await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1))[0] ?? null
}

export async function requireAdmin(event: H3Event) {
  const admin = await getAdminFromSession(event)
  if (!admin) throw createError({ statusCode: 401, statusMessage: 'Admin session required' })
  return admin
}

export function clearAdminSession(event: H3Event) {
  deleteCookie(event, ADMIN_COOKIE, { path: '/' })
}
