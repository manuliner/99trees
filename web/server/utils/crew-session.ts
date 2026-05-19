import type { H3Event } from 'h3'
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { getDb } from './db'
import { editions } from '../database/schema'

const CREW_COOKIE = 'crew_session'

export function hashCrewToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function crewSessionSecret(): string {
  const config = useRuntimeConfig()
  return String(config.crewSessionPassword)
}

function signCrewValue(editionId: number, token: string): string {
  const payload = `${editionId}:${token}`
  const sig = createHmac('sha256', crewSessionSecret()).update(payload).digest('hex')
  return `${payload}:${sig}`
}

function parseSignedCrewCookie(raw: string): { editionId: number; token: string } | null {
  const sigSep = raw.lastIndexOf(':')
  if (sigSep <= 0) return null
  const sig = raw.slice(sigSep + 1)
  const payload = raw.slice(0, sigSep)
  const tokenSep = payload.indexOf(':')
  if (tokenSep <= 0) return null
  const editionId = Number(payload.slice(0, tokenSep))
  const token = payload.slice(tokenSep + 1)
  if (!Number.isFinite(editionId) || !token) return null

  const expected = createHmac('sha256', crewSessionSecret())
    .update(`${editionId}:${token}`)
    .digest('hex')
  if (sig.length !== expected.length) return null
  try {
    if (!timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(expected, 'utf8'))) return null
  }
  catch {
    return null
  }
  return { editionId, token }
}

export async function setCrewSession(event: H3Event, editionId: number) {
  const token = randomBytes(32).toString('hex')
  const hash = hashCrewToken(token)
  const db = getDb()
  await db
    .update(editions)
    .set({ crewSessionTokenHash: hash })
    .where(eq(editions.id, editionId))

  setCookie(event, CREW_COOKIE, signCrewValue(editionId, token), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  })
}

export async function clearCrewSession(event: H3Event, editionId: number) {
  const db = getDb()
  await db
    .update(editions)
    .set({ crewSessionTokenHash: null })
    .where(eq(editions.id, editionId))
  deleteCookie(event, CREW_COOKIE, { path: '/' })
}

export async function getCrewEditionId(event: H3Event): Promise<number | null> {
  const raw = getCookie(event, CREW_COOKIE)
  if (!raw) return null
  const parsed = parseSignedCrewCookie(raw)
  if (!parsed) return null

  const db = getDb()
  const row = (
    await db
      .select({ crewSessionTokenHash: editions.crewSessionTokenHash })
      .from(editions)
      .where(eq(editions.id, parsed.editionId))
      .limit(1)
  )[0]
  if (!row?.crewSessionTokenHash) return null
  if (row.crewSessionTokenHash !== hashCrewToken(parsed.token)) return null
  return parsed.editionId
}

export async function requireCrewEdition(event: H3Event): Promise<number> {
  const editionId = await getCrewEditionId(event)
  if (!editionId) {
    throw createError({ statusCode: 401, statusMessage: 'Crew session required' })
  }
  return editionId
}

export async function verifyCrewLogin(editionId: number, password: string): Promise<boolean> {
  const db = getDb()
  const edition = (await db.select().from(editions).where(eq(editions.id, editionId)).limit(1))[0]
  if (!edition?.crewPasswordHash) return false
  const bcrypt = await import('bcryptjs')
  return bcrypt.compare(password, edition.crewPasswordHash)
}
