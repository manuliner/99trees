import { and, asc, eq, like } from 'drizzle-orm'
import { teams } from '../database/schema'
import { getDb } from '../utils/db'

export type TeamDirectoryEntry = {
  id: number
  name: string
  avatarId: string | null
  motto: string | null
}

const DIRECTORY_LIMIT = 100

export async function listEditionTeamsForDirectory(
  editionId: number,
  q?: string,
): Promise<TeamDirectoryEntry[]> {
  const db = getDb()
  const trimmed = q?.trim() ?? ''
  const conditions = [eq(teams.editionId, editionId)]
  if (trimmed.length > 0) {
    conditions.push(like(teams.name, `%${trimmed}%`))
  }

  return db
    .select({
      id: teams.id,
      name: teams.name,
      avatarId: teams.avatarId,
      motto: teams.motto,
    })
    .from(teams)
    .where(and(...conditions))
    .orderBy(asc(teams.name))
    .limit(DIRECTORY_LIMIT)
}
