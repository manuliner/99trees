import { eq } from 'drizzle-orm'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileTypeFromBuffer } from 'file-type'
import { getDb } from '../../../../utils/db'
import { editions } from '../../../../database/schema'
import { requireAdmin } from '../../../../utils/admin-session'

const ALLOWED_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const editionId = Number(getRouterParam(event, 'id'))
  const form = await readMultipartFormData(event)
  const file = form?.find((p) => p.name === 'logo' && p.data)
  if (!file?.data?.length) {
    throw createError({ statusCode: 400, statusMessage: 'logo file required' })
  }
  if (file.data.length > 2 * 1024 * 1024) {
    throw createError({ statusCode: 400, statusMessage: 'Logo file too large (max 2 MB)' })
  }

  const detected = await fileTypeFromBuffer(file.data)
  const mime = detected?.mime
  if (!mime || !ALLOWED_MIMES.has(mime)) {
    throw createError({ statusCode: 400, statusMessage: 'Logo must be PNG, JPEG, or WebP' })
  }
  const safeExt = EXT_BY_MIME[mime]!

  const config = useRuntimeConfig()
  const dataRoot = dirname(resolve(config.sqliteDatabasePath as string))
  const uploadDir = join(dataRoot, 'uploads', 'editions')
  await mkdir(uploadDir, { recursive: true })
  const filename = `${editionId}-logo.${safeExt}`
  await writeFile(join(uploadDir, filename), file.data)

  const joinLogoPath = `/api/uploads/editions/${filename}`
  const db = getDb()
  const updated = await db
    .update(editions)
    .set({ joinLogoPath })
    .where(eq(editions.id, editionId))
    .returning()

  if (!updated[0]) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })
  return { joinLogoPath }
})
