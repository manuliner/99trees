import { z } from 'zod'
import { requireTeam } from '../../../utils/team-session'
import { applyStationScan } from '../../../services/turn-scan'

const scanSchema = z.object({
  stationSlug: z.string().min(1),
  token: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const team = await requireTeam(event)
  const turnId = Number(getRouterParam(event, 'id'))
  const body = scanSchema.parse(await readBody(event))

  return applyStationScan({
    teamId: team.id,
    editionId: team.editionId,
    turnId,
    stationSlug: body.stationSlug,
    token: body.token,
  })
})
