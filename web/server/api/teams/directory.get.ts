import { listEditionTeamsForDirectory } from '../../services/team-directory'

export default defineEventHandler(async (event) => {
  const editionId = Number(getQuery(event).editionId)
  if (!Number.isFinite(editionId)) {
    throw createError({ statusCode: 400, statusMessage: 'editionId required' })
  }

  const q = String(getQuery(event).q ?? '')
  const teams = await listEditionTeamsForDirectory(editionId, q)
  return { teams }
})
