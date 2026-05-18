import type { H3Event } from 'h3'
import { createHash, randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { getDb } from './db'
import { teams } from '../database/schema'

const TEAM_COOKIE = 'team_session'

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function createSessionToken(): string {
  return randomBytes(32).toString('hex')
}

export async function setTeamSession(event: H3Event, teamId: number) {
  const token = createSessionToken()
  const db = getDb()
  await db
    .update(teams)
    .set({ sessionTokenHash: hashToken(token) })
    .where(eq(teams.id, teamId))

  setCookie(event, TEAM_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 48,
  })
}

export async function clearTeamSession(event: H3Event, teamId: number) {
  const db = getDb()
  await db
    .update(teams)
    .set({ sessionTokenHash: null })
    .where(eq(teams.id, teamId))

  deleteCookie(event, TEAM_COOKIE, { path: '/' })
}

export async function getTeamFromSession(event: H3Event) {
  const token = getCookie(event, TEAM_COOKIE)
  if (!token) return null

  const db = getDb()
  const hash = hashToken(token)
  const rows = await db.select().from(teams).where(eq(teams.sessionTokenHash, hash)).limit(1)
  return rows[0] ?? null
}

export function requireTeam(event: H3Event) {
  return getTeamFromSession(event).then((team) => {
    if (!team) {
      throw createError({ statusCode: 401, statusMessage: 'Team session required' })
    }
    return team
  })
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'team'
}

export function parseCompletedFields(json: string): number[] {
  try {
    return JSON.parse(json) as number[]
  }
  catch {
    return []
  }
}

export function serializeCompletedFields(fields: number[]): string {
  return JSON.stringify([...new Set(fields)].sort((a, b) => a - b))
}
