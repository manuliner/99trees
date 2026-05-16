import { z } from 'zod'
import { setCrewSession, verifyCrewLogin } from '../../utils/crew-session'
import { getEditionOrThrow } from '../../services/game'

const schema = z.object({
  editionId: z.number().int().positive(),
  password: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const body = schema.parse(await readBody(event))
  await getEditionOrThrow(body.editionId)
  const ok = await verifyCrewLogin(body.editionId, body.password)
  if (!ok) throw createError({ statusCode: 401, statusMessage: 'Invalid crew password' })
  setCrewSession(event, body.editionId)
  return { ok: true, editionId: body.editionId }
})
