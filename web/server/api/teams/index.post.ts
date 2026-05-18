import { eq, and } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { createTeamSchema } from '#shared/schemas'
import { parseBody } from '../../utils/parse-body'
import { getDb } from '../../utils/db'
import { editions, teams } from '../../database/schema'
import { setTeamSession, slugify, createSessionToken } from '../../utils/team-session'
import { getEditionOrThrow } from '../../services/game'
import { teamQrPath } from '#shared/edition-urls'

export default defineEventHandler(async (event) => {
  const body = parseBody(createTeamSchema, await readBody(event))
  const edition = await getEditionOrThrow(body.editionId)
  if (edition.status !== 'live') {
    throw createError({ statusCode: 403, statusMessage: 'Game is not live yet' })
  }

  const db = getDb()
  const existing = await db
    .select()
    .from(teams)
    .where(and(eq(teams.editionId, body.editionId), eq(teams.name, body.name)))
    .limit(1)
  if (existing[0]) {
    throw createError({ statusCode: 409, statusMessage: 'Team name already taken' })
  }

  const pinHash = await bcrypt.hash(body.pin, 10)
  const slug = `${slugify(body.name)}-${randomBytes(3).toString('hex')}`
  const teamQrToken = randomBytes(16).toString('hex')
  const now = new Date()

  const inserted = await db
    .insert(teams)
    .values({
      editionId: body.editionId,
      name: body.name,
      slug,
      pinHash,
      teamQrToken,
      positionConfirmed: 0,
      scoreTotal: 0,
      completedFieldsJson: '[]',
      overflowFieldsJson: '[]',
      teamSize: body.size ?? null,
      createdAt: now,
    })
    .returning()

  const team = inserted[0]!
  await setTeamSession(event, team.id)

  return {
    team: { id: team.id, name: team.name, editionId: team.editionId },
    teamQrPath: teamQrPath(team.editionId, team.slug, team.teamQrToken),
  }
})
