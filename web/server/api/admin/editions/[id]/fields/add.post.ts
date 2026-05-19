import { MAX_EDITION_FIELD_COUNT } from '#shared/types'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../../../utils/db'
import { editions } from '../../../../../database/schema'
import { requireAdmin } from '../../../../../utils/admin-session'
import { assertCanEditBoardFields } from '../../../../../utils/admin-board-edit'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const editionId = Number(getRouterParam(event, 'id'))
  const db = getDb()

  const edition = (
    await db.select().from(editions).where(eq(editions.id, editionId)).limit(1)
  )[0]
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })
  await assertCanEditBoardFields(edition)
  if (edition.fieldCount >= MAX_EDITION_FIELD_COUNT) {
    throw createError({
      statusCode: 400,
      statusMessage: `Board cannot exceed ${MAX_EDITION_FIELD_COUNT} fields`,
    })
  }

  const fieldCount = edition.fieldCount + 1
  await db.update(editions).set({ fieldCount }).where(eq(editions.id, editionId))

  return { fieldCount }
})
