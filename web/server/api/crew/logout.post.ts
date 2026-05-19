import { clearCrewSession, requireCrewEdition } from '../../utils/crew-session'

export default defineEventHandler(async (event) => {
  const editionId = await requireCrewEdition(event)
  await clearCrewSession(event, editionId)
  return { ok: true }
})
