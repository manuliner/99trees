import { getEditionOrThrow } from '../../../services/game'

/** Legacy redirect helper: numeric id → slug */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid edition id' })
  }
  const edition = await getEditionOrThrow(id)
  return { slug: edition.slug }
})
