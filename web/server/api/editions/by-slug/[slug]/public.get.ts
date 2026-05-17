import { getEditionBySlugOrThrow, publicEditionPayload } from '../../../../services/game'

export default defineEventHandler(async (event) => {
  const rawSlug = getRouterParam(event, 'slug')
  if (!rawSlug) throw createError({ statusCode: 400, statusMessage: 'Missing edition slug' })
  const edition = await getEditionBySlugOrThrow(rawSlug)
  return publicEditionPayload(edition)
})
