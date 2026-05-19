import { clearAdminSession, requireAdmin } from '../../utils/admin-session'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  await clearAdminSession(event)
  return { ok: true }
})
