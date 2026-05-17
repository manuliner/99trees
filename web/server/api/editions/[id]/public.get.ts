import { getEditionOrThrow, publicEditionPayload } from '../../../services/game'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid edition id' })
  }
  const edition = await getEditionOrThrow(id)
  return publicEditionPayload(edition)
})
