import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import type { AdminTeamListItem, TurnState } from '#shared/types'
import { getDb } from '../utils/db'
import { editions, tasks, teams, turns } from '../database/schema'

const OPEN_TURN_STATES = [
  'rolled',
  'scanned',
  'awaiting_crew',
  'awaiting_crew_bg',
  'awaiting_coop',
  'awaiting_coop_bg',
  'completed',
] as const

function parseCompletedFields(json: string): number[] {
  try {
    const parsed = JSON.parse(json) as unknown
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : []
  }
  catch {
    return []
  }
}

export async function listAdminTeams(editionId: number): Promise<AdminTeamListItem[]> {
  const db = getDb()
  const edition = (
    await db.select().from(editions).where(eq(editions.id, editionId)).limit(1)
  )[0]
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })

  const teamRows = await db
    .select()
    .from(teams)
    .where(eq(teams.editionId, editionId))
    .orderBy(desc(teams.scoreTotal), asc(teams.name))

  if (teamRows.length === 0) return []

  const teamIds = teamRows.map((t) => t.id)
  const turnRows = await db
    .select({
      teamId: turns.teamId,
      state: turns.state,
      positionPending: turns.positionPending,
      fieldNumber: tasks.fieldNumber,
    })
    .from(turns)
    .leftJoin(tasks, eq(turns.taskId, tasks.id))
    .where(
      and(
        inArray(turns.teamId, teamIds),
        inArray(turns.state, [...OPEN_TURN_STATES]),
      ),
    )
    .orderBy(desc(turns.id))

  const openByTeam = new Map<number, { state: TurnState; positionPending: number; fieldNumber: number | null }>()
  for (const row of turnRows) {
    if (openByTeam.has(row.teamId)) continue
    openByTeam.set(row.teamId, {
      state: row.state as TurnState,
      positionPending: row.positionPending,
      fieldNumber: row.fieldNumber,
    })
  }

  return teamRows.map((team) => {
    const completed = parseCompletedFields(team.completedFieldsJson)
    const open = openByTeam.get(team.id)
    return {
      id: team.id,
      name: team.name,
      slug: team.slug,
      positionConfirmed: team.positionConfirmed,
      positionPending: open?.positionPending ?? null,
      scoreTotal: team.scoreTotal,
      completedCount: completed.length,
      reachedGoal: team.reachedGoalAt != null,
      openTurnState: open?.state ?? null,
      openTurnField: open?.fieldNumber ?? null,
    }
  })
}
