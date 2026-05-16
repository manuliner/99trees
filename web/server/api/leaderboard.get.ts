import { eq, desc } from 'drizzle-orm'
import { getDb } from '../utils/db'
import { editions, teams } from '../database/schema'

export default defineEventHandler(async (event) => {
  const editionId = Number(getQuery(event).editionId)
  if (!Number.isFinite(editionId)) {
    throw createError({ statusCode: 400, statusMessage: 'editionId required' })
  }

  const db = getDb()
  const edition = (
    await db.select().from(editions).where(eq(editions.id, editionId)).limit(1)
  )[0]
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })

  const allTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.editionId, editionId))
    .orderBy(desc(teams.scoreTotal))

  const qualified = allTeams
    .filter((t) => t.reachedGoalAt != null)
    .sort((a, b) => {
      if (b.scoreTotal !== a.scoreTotal) return b.scoreTotal - a.scoreTotal
      return (a.reachedGoalAt?.getTime() ?? 0) - (b.reachedGoalAt?.getTime() ?? 0)
    })

  const showOfficialOnly = edition.status === 'ended'
  let displayTeams = showOfficialOnly ? qualified : allTeams

  if (showOfficialOnly && displayTeams.length === 0) {
    displayTeams = [...allTeams].sort((a, b) => {
      if (b.positionConfirmed !== a.positionConfirmed) return b.positionConfirmed - a.positionConfirmed
      return b.scoreTotal - a.scoreTotal
    })
  }

  const winnerTeamId =
    showOfficialOnly && displayTeams.length > 0 ? displayTeams[0]!.id : null

  return {
    edition: { id: edition.id, name: edition.name, status: edition.status, fieldCount: edition.fieldCount },
    updatedAt: new Date().toISOString(),
    winnerTeamId,
    fallbackRanking: showOfficialOnly && qualified.length === 0,
    teams: displayTeams.map((t) => ({
      id: t.id,
      name: t.name,
      position: t.positionConfirmed,
      scoreTotal: t.scoreTotal,
      reachedGoal: t.reachedGoalAt != null,
      underWay: t.reachedGoalAt == null,
    })),
    officialRanking: showOfficialOnly && qualified.length > 0,
  }
})
