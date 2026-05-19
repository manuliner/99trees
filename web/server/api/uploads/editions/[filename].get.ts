import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

const SAFE_FILENAME = /^[a-zA-Z0-9._-]+$/

export default defineEventHandler((event) => {
  const filename = getRouterParam(event, 'filename')
  if (!filename || filename.includes('..') || !SAFE_FILENAME.test(filename)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid filename' })
  }

  const config = useRuntimeConfig()
  const uploadRoot = join(
    dirname(resolve(config.sqliteDatabasePath as string)),
    'uploads',
    'editions',
  )
  const filePath = resolve(uploadRoot, filename)
  if (filePath !== uploadRoot && !filePath.startsWith(`${uploadRoot}${sep}`)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid filename' })
  }
  if (!existsSync(filePath)) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const ext = filename.split('.').pop()?.toLowerCase() ?? 'png'
  const body = readFileSync(filePath)
  setHeader(event, 'Content-Type', MIME[ext] ?? 'application/octet-stream')
  setHeader(event, 'Content-Length', body.length)
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  return body
})
