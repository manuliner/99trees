import { eq } from 'drizzle-orm'
import { getDb } from '../../../utils/db'
import { turns } from '../../../database/schema'
import { requireTeam } from '../../../utils/team-session'
import { getEditionOrThrow, getOpenTurn } from '../../../services/game'
import { parseEditionConfig } from '../../../utils/edition-config'

export default defineEventHandler(async (event) => {
  const team = await requireTeam(event)
  const turnId = Number(getRouterParam(event, 'id'))
  const open = await getOpenTurn(team.id)
  if (!open || open.id !== turnId || open.state !== 'rolled') {
    throw createError({ statusCode: 400, statusMessage: 'Cannot abandon this turn' })
  }

  const edition = await getEditionOrThrow(team.editionId)
  const cfg = parseEditionConfig(edition.configJson)
  const now = Date.now()
  const rolledAt = open.rolledAt?.getTime() ?? now
  const allUnlocked =
    open.hintMode === 'reveal_all' || now >= rolledAt + cfg.hintTimerMinutes[2]! * 60_000

  if (!allUnlocked) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Wait for all hints or use Reveal All first',
    })
  }

  const db = getDb()
  await db
    .update(turns)
    .set({ state: 'abandoned', scoreDelta: 0, confirmedAt: new Date() })
    .where(eq(turns.id, turnId))

  return { ok: true, scoreDelta: 0, message: 'Zero round — no progress' }
})
