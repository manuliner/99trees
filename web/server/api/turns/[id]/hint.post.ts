import { eq } from 'drizzle-orm'
import { hintSchema } from '#shared/schemas'
import { getDb } from '../../../utils/db'
import { turns } from '../../../database/schema'
import { requireTeam } from '../../../utils/team-session'
import { deductHintCost, getEditionOrThrow, getActivePlayTurn } from '../../../services/game'
import { parseEditionConfig } from '../../../utils/edition-config'
import { assertEditionLive } from '../../../utils/edition-live'

export default defineEventHandler(async (event) => {
  const team = await requireTeam(event)
  const turnId = Number(getRouterParam(event, 'id'))
  const body = hintSchema.parse(await readBody(event))
  const open = await getActivePlayTurn(team.id)
  if (!open || open.id !== turnId || open.state !== 'rolled') {
    throw createError({ statusCode: 400, statusMessage: 'No active search turn' })
  }

  const edition = await getEditionOrThrow(team.editionId)
  assertEditionLive(edition.status, 'use hints')
  const config = parseEditionConfig(edition.configJson)
  const now = Date.now()
  const rolledAt = open.rolledAt?.getTime() ?? now
  const unlockAt = config.hintTimerMinutes.map((m) => rolledAt + m * 60_000)

  const db = getDb()
  let hintsUsed: number[] = []
  try {
    hintsUsed = JSON.parse(open.hintsUsedJson) as number[]
  }
  catch {
    hintsUsed = []
  }

  let pointCost = 0
  let hintMode = open.hintMode

  if (body.mode === 'reveal_all') {
    if (now < unlockAt[0]!) {
      /* allow reveal all early at higher cost — already -50 */
    }
    hintMode = 'reveal_all'
    pointCost = config.hintCosts.revealAll
    hintsUsed = [1, 2, 3]
  }
  else if (body.level) {
    if (now < unlockAt[body.level - 1]!) {
      throw createError({ statusCode: 400, statusMessage: 'Hint not unlocked yet' })
    }
    if (!hintsUsed.includes(body.level)) hintsUsed.push(body.level)
    hintMode = hintMode ?? 'wait'
    pointCost = hintsUsed.reduce((sum, l) => sum + (config.hintCosts.wait[l - 1] ?? 0), 0)
  }
  else {
    throw createError({ statusCode: 400, statusMessage: 'level or mode required' })
  }

  await db
    .update(turns)
    .set({ hintsUsedJson: JSON.stringify(hintsUsed), hintMode })
    .where(eq(turns.id, turnId))

  const deducted = await deductHintCost(team.id, turnId, pointCost)

  return { hintsUsed, hintMode, pointCostPreview: pointCost, pointsDeducted: deducted }
})
