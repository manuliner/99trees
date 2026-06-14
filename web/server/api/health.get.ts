import { setResponseStatus } from 'h3'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { editions } from '../database/schema'
import { getDb } from '../utils/db'
import { isProductionRuntime } from '../utils/runtime-env'

interface VersionInfo {
  version?: string
  buildTime?: string
}

function readVersionInfo(): VersionInfo {
  const candidates = [
    join(process.cwd(), 'public', 'version.json'),
    join(process.cwd(), '.output', 'public', 'version.json'),
    join(process.cwd(), 'web', 'public', 'version.json'),
  ]

  for (const path of candidates) {
    try {
      if (!existsSync(path)) continue
      const parsed = JSON.parse(readFileSync(path, 'utf8')) as VersionInfo
      if (parsed?.version) return parsed
    }
    catch {
      // try the next candidate
    }
  }

  return {}
}

function checkDatabase(): boolean {
  try {
    getDb().select({ id: editions.id }).from(editions).limit(1)
    return true
  }
  catch {
    return false
  }
}

const cachedVersion: VersionInfo = readVersionInfo()
const cachedAppVersion = process.env.NUXT_APP_VERSION

export default defineEventHandler((event) => {
  const dbHealthy = checkDatabase()

  if (isProductionRuntime()) {
    if (!dbHealthy) {
      setResponseStatus(event, 503)
      return { status: 'unhealthy' as const }
    }
    return { status: 'ok' as const }
  }

  const config = useRuntimeConfig()
  const status = dbHealthy ? 'ok' as const : 'unhealthy' as const
  if (!dbHealthy) {
    setResponseStatus(event, 503)
  }

  return {
    status,
    version: cachedVersion.version ?? cachedAppVersion ?? config.public.appVersion ?? 'unknown',
    buildTime: cachedVersion.buildTime ?? null,
    environment: process.env.NUXT_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    timestamp: new Date().toISOString(),
    checks: {
      database: dbHealthy ? 'healthy' : 'unhealthy',
    },
  }
})
