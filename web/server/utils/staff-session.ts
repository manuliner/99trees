import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { getCrewEditionId } from './crew-session'
import { getAdminFromSession } from './admin-session'
import { getDb } from './db'
import { teams } from '../database/schema'

export async function resolveStaffEditionId(event: H3Event): Promise<number> {
  const admin = await getAdminFromSession(event)
  if (admin) {
    const editionId = Number(getQuery(event).editionId)
    if (!Number.isFinite(editionId)) {
      throw createError({ statusCode: 400, statusMessage: 'editionId required' })
    }
    return editionId
  }
  const crewEditionId = await getCrewEditionId(event)
  if (!crewEditionId) {
    throw createError({ statusCode: 401, statusMessage: 'Staff session required' })
  }
  return crewEditionId
}

export async function requireStaffEdition(event: H3Event, editionId: number): Promise<void> {
  const admin = await getAdminFromSession(event)
  if (admin) return

  const crewEditionId = await getCrewEditionId(event)
  if (crewEditionId === editionId) return

  throw createError({ statusCode: 403, statusMessage: 'Not allowed for this edition' })
}

export async function requireStaffForTeam(event: H3Event, teamId: number): Promise<number> {
  const db = getDb()
  const team = (await db.select().from(teams).where(eq(teams.id, teamId)).limit(1))[0]
  if (!team) throw createError({ statusCode: 404, statusMessage: 'Team not found' })

  const admin = await getAdminFromSession(event)
  if (admin) return team.editionId

  const crewEditionId = await getCrewEditionId(event)
  if (!crewEditionId) {
    throw createError({ statusCode: 401, statusMessage: 'Staff session required' })
  }
  if (crewEditionId !== team.editionId) {
    throw createError({ statusCode: 403, statusMessage: 'Not allowed for this team' })
  }
  return team.editionId
}
