import { requireTeam } from '../../../../utils/team-session'
import { assertDevOnly } from '../../../../utils/dev-only'
import { getEditionOrThrow, getActivePlayTurn, getTaskForField } from '../../../../services/game'
import { applyTaskScan } from '../../../../services/turn-scan'

export default defineEventHandler(async (event) => {
  assertDevOnly()
  const team = await requireTeam(event)
  const turnId = Number(getRouterParam(event, 'id'))
  const open = await getActivePlayTurn(team.id)
  if (!open || open.id !== turnId || open.state !== 'rolled') {
    throw createError({ statusCode: 400, statusMessage: 'Scan not allowed now' })
  }

  const edition = await getEditionOrThrow(team.editionId)
  const task = await getTaskForField(edition.id, open.positionPending)
  if (!task) {
    throw createError({ statusCode: 400, statusMessage: 'No task for pending field' })
  }

  return applyTaskScan({
    teamId: team.id,
    editionId: team.editionId,
    turnId,
    taskSlug: task.slug,
    token: task.qrToken,
  })
})
