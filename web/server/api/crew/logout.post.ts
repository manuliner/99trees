import { requireCrewEdition } from '../../utils/crew-session'

export default defineEventHandler((event) => {
  requireCrewEdition(event)
  deleteCookie(event, 'crew_session', { path: '/' })
  return { ok: true }
})
