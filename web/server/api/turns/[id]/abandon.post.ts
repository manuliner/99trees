import { eq } from 'drizzle-orm'
import { getDb } from '../../../utils/db'
import { turns } from '../../../database/schema'
import { requireTeam } from '../../../utils/team-session'
import {
  deductHintCost,
  getEditionOrThrow,
  getActivePlayTurn,
  parseHintsUsed,
  revertTeamOverflowAfterAbandon,
} from '../../../services/game'
import { parseEditionConfig } from '../../../utils/edition-config'
import { assertEditionLive } from '../../../utils/edition-live'
import { hintPenalty } from '#shared/scoring'

export default defineEventHandler(async (event) => {
  const team = await requireTeam(event)
  const turnId = Number(getRouterParam(event, 'id'))
  const open = await getActivePlayTurn(team.id)
  if (!open || open.id !== turnId) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot abandon this turn' })
  }

  const allowedStates = ['rolled', 'awaiting_crew', 'awaiting_coop']
  if (!allowedStates.includes(open.state)) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot abandon this turn' })
  }

  const edition = await getEditionOrThrow(team.editionId)
  assertEditionLive(edition.status, 'abandon turn')
  const cfg = parseEditionConfig(edition.configJson)

  if (open.state === 'rolled') {
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
  }

  const hintsUsed = parseHintsUsed(open.hintsUsedJson)
  const hintCost = hintPenalty(cfg, (open.hintMode as 'wait' | 'reveal_all') ?? null, hintsUsed)
  const deducted = await deductHintCost(team.id, turnId, hintCost)

  const db = getDb()
  await db
    .update(turns)
    .set({ state: 'abandoned', scoreDelta: 0, confirmedAt: new Date() })
    .where(eq(turns.id, turnId))

  await revertTeamOverflowAfterAbandon(team.id, open)

  return {
    ok: true,
    scoreDelta: 0,
    hintPointsDeducted: deducted,
    message: 'Zero round — no progress',
  }
})
