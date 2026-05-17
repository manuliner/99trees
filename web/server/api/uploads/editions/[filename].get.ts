import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

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
  const body = readFileSync(path)
  setHeader(event, 'Content-Type', MIME[ext] ?? 'application/octet-stream')
  setHeader(event, 'Content-Length', body.length)
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  return body
})
