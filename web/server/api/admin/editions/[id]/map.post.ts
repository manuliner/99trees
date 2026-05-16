import { eq } from 'drizzle-orm'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { getDb } from '../../../../utils/db'
import { editions } from '../../../../database/schema'
import { requireAdmin } from '../../../../utils/admin-session'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const editionId = Number(getRouterParam(event, 'id'))
  const form = await readMultipartFormData(event)
  const file = form?.find((p) => p.name === 'map' && p.data)
  if (!file?.data?.length) {
    throw createError({ statusCode: 400, statusMessage: 'map file required' })
  }
  if (file.data.length > 8 * 1024 * 1024) {
    throw createError({ statusCode: 400, statusMessage: 'Map file too large (max 8 MB)' })
  }

  const ext = file.filename?.match(/\.(png|jpe?g|webp)$/i)?.[1]?.toLowerCase() ?? 'png'
  const safeExt = ext === 'jpeg' ? 'jpg' : ext
  const config = useRuntimeConfig()
  const dataRoot = dirname(resolve(config.sqliteDatabasePath as string))
  const uploadDir = join(dataRoot, 'uploads', 'editions')
  await mkdir(uploadDir, { recursive: true })
  const filename = `${editionId}.${safeExt}`
  await writeFile(join(uploadDir, filename), file.data)

  const mapImagePath = `/api/uploads/editions/${filename}`
  const db = getDb()
  const updated = await db
    .update(editions)
    .set({ mapImagePath })
    .where(eq(editions.id, editionId))
    .returning()

  if (!updated[0]) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })
  return { mapImagePath }
})
