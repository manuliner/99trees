import { coopLinkSchema } from '#shared/schemas'
import { requireTeam } from '../../utils/team-session'
import { linkCoopBonus } from '../../services/coop'
import { buildMePayload } from '../../services/game'

export default defineEventHandler(async (event) => {
  const team = await requireTeam(event)
  const body = coopLinkSchema.parse(await readBody(event))

  const result = await linkCoopBonus(team.id, body.partnerSlug, body.token, {
    depotId: body.depotId,
    turnId: body.turnId,
  })

  const me = await buildMePayload(team.id)
  return { ...result, me }
})
