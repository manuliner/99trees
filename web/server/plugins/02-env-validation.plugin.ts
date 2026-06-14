import { existsSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { repoPath, resolveSqliteDatabasePath } from '../utils/resolve-sqlite-path'
import { writeLog } from '../utils/log'

const DEFAULT_SESSION_PASSWORD = 'change-me-in-production-at-least-32-chars'
const DEFAULT_CREW_SESSION_PASSWORD = 'change-me-crew-session-32-chars-min'
const DEFAULT_ADMIN_INIT_SECRET = 'dev-init-secret'

function secretStatus(envKey: string, devDefault: string, minLength = 32): string {
  const raw = process.env[envKey]?.trim()
  if (!raw) return '✗ Not set (using dev default)'
  if (raw === devDefault) return '✗ Using dev default'
  if (raw.length < minLength) return `✗ Too short (${raw.length} chars, need ${minLength})`
  return '✓ Set'
}

export default defineNitroPlugin(async () => {
  const environment = process.env.NUXT_ENVIRONMENT || process.env.NODE_ENV || 'development'
  const isProduction = environment === 'production'

  const sessionPassword = process.env.NUXT_SESSION_PASSWORD?.trim() || DEFAULT_SESSION_PASSWORD
  const crewSessionPassword = process.env.NUXT_CREW_SESSION_PASSWORD?.trim() || DEFAULT_CREW_SESSION_PASSWORD
  const adminInitSecret = process.env.NUXT_ADMIN_INIT_SECRET?.trim() || DEFAULT_ADMIN_INIT_SECRET

  const config = {
    environment,
    sqliteDatabasePath: resolveSqliteDatabasePath(
      (() => {
        try {
          return useRuntimeConfig().sqliteDatabasePath as string | undefined
        }
        catch {
          return undefined
        }
      })(),
    ),
    sessionPassword: secretStatus('NUXT_SESSION_PASSWORD', DEFAULT_SESSION_PASSWORD),
    crewSessionPassword: secretStatus('NUXT_CREW_SESSION_PASSWORD', DEFAULT_CREW_SESSION_PASSWORD),
    adminInitSecret: adminInitSecret === DEFAULT_ADMIN_INIT_SECRET
      ? '✗ Using dev default'
      : adminInitSecret
        ? '✓ Set'
        : '✗ Not set (using dev default)',
    public: {
      appVersion: process.env.NUXT_APP_VERSION || process.env.NUXT_PUBLIC_APP_VERSION || '0.0.0',
    },
  }

  if (isProduction) {
    if (sessionPassword === DEFAULT_SESSION_PASSWORD || sessionPassword.length < 32) {
      throw new Error(
        '[env] FATAL: NUXT_SESSION_PASSWORD must be set to a unique value (≥32 chars) in production.',
      )
    }
    if (crewSessionPassword === DEFAULT_CREW_SESSION_PASSWORD || crewSessionPassword.length < 32) {
      throw new Error(
        '[env] FATAL: NUXT_CREW_SESSION_PASSWORD must be set to a unique value (≥32 chars) in production.',
      )
    }
    if (adminInitSecret === DEFAULT_ADMIN_INIT_SECRET) {
      throw new Error(
        '[env] FATAL: NUXT_ADMIN_INIT_SECRET must be set to a unique value in production.',
      )
    }
  }

  try {
    let version = 'unknown'
    let buildTime = 'unknown'

    const possiblePaths = [
      repoPath('public', 'version.json'),
      repoPath('.output', 'public', 'version.json'),
    ]

    for (const versionPath of possiblePaths) {
      try {
        const content = readFileSync(versionPath, 'utf8')
        const versionData = JSON.parse(content) as { version?: string; buildTime?: string }
        if (versionData?.version) {
          version = versionData.version
          if (versionData.buildTime) {
            const parsed = new Date(versionData.buildTime)
            if (!Number.isNaN(parsed.getTime())) {
              buildTime = parsed.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
            }
          }
          break
        }
      }
      catch {
        continue
      }
    }

    if (version === 'unknown') {
      try {
        const pkg = JSON.parse(readFileSync(repoPath('package.json'), 'utf8')) as { version?: string }
        version = pkg.version || 'unknown'
      }
      catch {
        // keep unknown
      }
    }

    const startupDate = new Date().toLocaleString('de-DE', { dateStyle: 'full', timeStyle: 'long' })

    const truncate = (s: string, n: number) =>
      s.length <= n ? s.padEnd(n) : `${s.slice(0, n - 1)}…`

    const truncatePath = (s: string, n: number) =>
      s.length <= n ? s.padEnd(n) : `…${s.slice(-(n - 1))}`

    const dbAbsolute = config.sqliteDatabasePath
    const dbRelative = relative(process.cwd(), dbAbsolute)
    const dbDisplay = dbRelative && !dbRelative.startsWith('..') && dbRelative.length < dbAbsolute.length
      ? dbRelative
      : dbAbsolute

    if (isProduction) {
      writeLog('info', 'startup', {
        component: 'env',
        version,
        buildTime,
        environment: config.environment,
        database: dbDisplay,
      })
      return
    }

    const banner = `
╔═══════════════════════════════════════════════════════════════╗
║                        Zugvögel                               ║
╠═══════════════════════════════════════════════════════════════╣
║  Version:      ${truncate(version, 43)} ║
║  Built:        ${truncate(buildTime, 43)} ║
║  Environment:  ${truncate(config.environment, 43)} ║
║  Started:      ${truncate(startupDate, 43)} ║
╠═══════════════════════════════════════════════════════════════╣
║  Database:     ${truncatePath(dbDisplay, 43)} ║
║  Session:      ${truncate(config.sessionPassword, 43)} ║
║  Crew session: ${truncate(config.crewSessionPassword, 43)} ║
║  Admin init:   ${truncate(config.adminInitSecret, 43)} ║
╚═══════════════════════════════════════════════════════════════╝
`
    console.log(banner)
  }
  catch (error) {
    writeLog('error', 'failed to display startup banner', {
      component: 'env',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})
