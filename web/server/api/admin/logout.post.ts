import { clearAdminSession, requireAdmin } from '../../utils/admin-session'

export default defineEventHandler((event) => {
  requireAdmin(event)
  clearAdminSession(event)
  return { ok: true }
})
