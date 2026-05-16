import type { H3Event } from 'h3'
import { createHash, randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { getDb } from './db'

const CREW_COOKIE = 'crew_session'

export function hashCrewToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function setCrewSession(event: H3Event, editionId: number) {
  const token = randomBytes(32).toString('hex')
  setCookie(event, CREW_COOKIE, `${editionId}:${token}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  })
  return hashCrewToken(token)
}

export function getCrewEditionId(event: H3Event): number | null {
  const raw = getCookie(event, CREW_COOKIE)
  if (!raw) return null
  const [editionPart] = raw.split(':')
  const editionId = Number(editionPart)
  return Number.isFinite(editionId) ? editionId : null
}

export function requireCrewEdition(event: H3Event): number {
  const editionId = getCrewEditionId(event)
  if (!editionId) {
    throw createError({ statusCode: 401, statusMessage: 'Crew session required' })
  }
  return editionId
}

export async function verifyCrewLogin(editionId: number, password: string): Promise<boolean> {
  const db = getDb()
  const { editions } = await import('../database/schema')
  const edition = (await db.select().from(editions).where(eq(editions.id, editionId)).limit(1))[0]
  if (!edition?.crewPasswordHash) return false
  const bcrypt = await import('bcryptjs')
  return bcrypt.compare(password, edition.crewPasswordHash)
}
