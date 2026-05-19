import { teamOnboardingPatchSchema } from '#shared/schemas'
import { parseBody } from '../../utils/parse-body'
import { requireTeam } from '../../utils/team-session'
import { patchTeamOnboarding } from '../../services/team-onboarding'

export default defineEventHandler(async (event) => {
  const team = await requireTeam(event)
  const body = parseBody(teamOnboardingPatchSchema, await readBody(event))
  return patchTeamOnboarding(team.id, body)
})
