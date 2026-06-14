import { defineNitroPlugin } from 'nitropack/runtime'
import { eq, inArray } from 'drizzle-orm'
import { getDb } from '../utils/db'
import { editions, tasks, teams, turns } from '../database/schema'
import { parseEditionConfig } from '../utils/edition-config'
import { confirmTurn } from '../services/game'
import { writeLog } from '../utils/log'

export default defineNitroPlugin(() => {
  const interval = setInterval(async () => {
    try {
      const db = getDb()
      const awaiting = await db
        .select({
          turn: turns,
          teamId: teams.id,
          editionId: teams.editionId,
          activityType: tasks.activityType,
        })
        .from(turns)
        .innerJoin(teams, eq(turns.teamId, teams.id))
        .leftJoin(tasks, eq(turns.taskId, tasks.id))
        .where(inArray(turns.state, ['awaiting_crew', 'awaiting_crew_bg']))

      const now = Date.now()
      for (const row of awaiting) {
        if (row.activityType !== 'performance') continue

        const edition = (
          await db.select().from(editions).where(eq(editions.id, row.editionId)).limit(1)
        )[0]
        if (!edition) continue
        const config = parseEditionConfig(edition.configJson)
        const scannedAt = row.turn.scannedAt?.getTime()
        if (!scannedAt) continue
        const timeoutMs = config.performanceTimeoutMinutes * 60_000
        if (now - scannedAt < timeoutMs) continue

        await db
          .update(turns)
          .set({ state: 'completed', completedAt: new Date(), bonusPoints: 0 })
          .where(eq(turns.id, row.turn.id))
        await confirmTurn(row.teamId, row.turn.id)
      }
    }
    catch (e) {
      writeLog('warn', 'performance timeout sweep failed', {
        component: 'performance-timeout',
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }, 60_000)

  if (typeof interval.unref === 'function') interval.unref()
})
