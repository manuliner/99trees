import { createReadStream, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { sendStream } from 'h3'

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

export default defineEventHandler((event) => {
  const filename = getRouterParam(event, 'filename')
  if (!filename || filename.includes('..')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid filename' })
  }

  const config = useRuntimeConfig()
  const path = join(dirname(resolve(config.sqliteDatabasePath as string)), 'uploads', 'editions', filename)
  if (!existsSync(path)) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const ext = filename.split('.').pop()?.toLowerCase() ?? 'png'
  setHeader(event, 'Content-Type', MIME[ext] ?? 'application/octet-stream')
  return sendStream(event, createReadStream(path))
})
