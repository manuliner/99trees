import { and, eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { rejoinTeamSchema } from '#shared/schemas'
import { parseBody } from '../../utils/parse-body'
import { getDb } from '../../utils/db'
import { teams } from '../../database/schema'
import { setTeamSession } from '../../utils/team-session'
import { getEditionOrThrow, buildMePayload } from '../../services/game'

export default defineEventHandler(async (event) => {
  const body = parseBody(rejoinTeamSchema, await readBody(event))
  await getEditionOrThrow(body.editionId)

  const db = getDb()
  const rows = await db
    .select()
    .from(teams)
    .where(and(eq(teams.editionId, body.editionId), eq(teams.name, body.name)))
    .limit(1)
  const team = rows[0]
  if (!team) throw createError({ statusCode: 401, statusMessage: 'Invalid team or PIN' })

  const ok = await bcrypt.compare(body.pin, team.pinHash)
  if (!ok) throw createError({ statusCode: 401, statusMessage: 'Invalid team or PIN' })

  await setTeamSession(event, team.id)
  return buildMePayload(team.id)
})
