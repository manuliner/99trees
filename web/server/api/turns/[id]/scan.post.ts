import { scanSchema } from '#shared/schemas'
import { requireTeam } from '../../../utils/team-session'
import { applyTaskScan } from '../../../services/turn-scan'

export default defineEventHandler(async (event) => {
  const team = await requireTeam(event)
  const turnId = Number(getRouterParam(event, 'id'))
  const body = scanSchema.parse(await readBody(event))

  return applyTaskScan({
    teamId: team.id,
    editionId: team.editionId,
    turnId,
    taskSlug: body.taskSlug,
    token: body.token,
  })
})
