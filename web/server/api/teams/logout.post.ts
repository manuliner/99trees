import { assertDevOnly } from '../../utils/dev-only'
import { clearTeamSession, requireTeam } from '../../utils/team-session'

export default defineEventHandler(async (event) => {
  assertDevOnly()
  const team = await requireTeam(event)
  await clearTeamSession(event, team.id)
  return { ok: true }
})
