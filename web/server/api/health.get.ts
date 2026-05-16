import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

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

const cachedVersion: VersionInfo = readVersionInfo()
const cachedAppVersion = process.env.NUXT_APP_VERSION

export default defineEventHandler(() => {
  const config = useRuntimeConfig()
  return {
    status: 'ok',
    version: cachedVersion.version ?? cachedAppVersion ?? config.public.appVersion ?? 'unknown',
    buildTime: cachedVersion.buildTime ?? null,
    environment: process.env.NUXT_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    timestamp: new Date().toISOString(),
  }
})
