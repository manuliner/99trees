import { defineNitroPlugin } from 'nitropack/runtime'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { repoPath, resolveSqliteDatabasePath } from '../utils/resolve-sqlite-path'

const MIGRATIONS_TABLE = '__drizzle_migrations'

function resolveDatabasePath(): string {
  try {
    const config = useRuntimeConfig()
    return resolveSqliteDatabasePath(config.sqliteDatabasePath as string | undefined)
  }
  catch {
    return resolveSqliteDatabasePath()
  }
}

function getAppliedCreatedAt(client: Database.Database): number[] {
  try {
    const rows = client.prepare(`SELECT created_at FROM ${MIGRATIONS_TABLE}`).all() as Array<{ created_at: number }>
    return rows.map((r) => r.created_at)
  }
  catch {
    return []
  }
}

function loadJournalTagsByWhen(migrationsFolder: string): Map<number, string> {
  const journalPath = join(migrationsFolder, 'meta', '_journal.json')
  if (!existsSync(journalPath)) return new Map()
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as { entries: Array<{ when: number, tag: string }> }
  return new Map((journal.entries ?? []).map((e) => [e.when, e.tag]))
}

/**
 * Resolve SQL migrations folder in dev, prod-from-source, and Docker layouts.
 * Docker copies migrations to `./migrations` (see repo Dockerfile).
 */
function resolveMigrationsFolder(): string | null {
  const candidates = [
    repoPath('server', 'database', 'migrations'),
    resolve(process.cwd(), 'migrations'),
    resolve(process.cwd(), 'server', 'database', 'migrations'),
    resolve(process.cwd(), 'web', 'server', 'database', 'migrations'),
  ]
  for (const dir of candidates) {
    if (existsSync(dir)) return dir
  }
  return null
}

export default defineNitroPlugin(async () => {
  const databasePath = resolveDatabasePath()
  const databaseDir = dirname(databasePath)
  if (!existsSync(databaseDir)) mkdirSync(databaseDir, { recursive: true })

  console.log('[db-migration] Starting database migration check')

  try {
    const client = new Database(databasePath)
    const db = drizzle(client)

    const migrationsFolder = resolveMigrationsFolder()
    if (!migrationsFolder) {
      console.warn(
        '[db-migration] Migrations folder not found (tried server/database/migrations, ./migrations, …); skipping.',
      )
      client.close()
      return
    }

    const whenToTag = loadJournalTagsByWhen(migrationsFolder)
    const appliedBefore = new Set(getAppliedCreatedAt(client))

    console.log('[db-migration] Running migrations from', migrationsFolder)

    migrate(db, { migrationsFolder })

    const appliedAfter = getAppliedCreatedAt(client)
    const newlyApplied = appliedAfter.filter((when) => !appliedBefore.has(when))
    const appliedTags = newlyApplied.map((when) => whenToTag.get(when)).filter(Boolean) as string[]

    if (appliedTags.length > 0) {
      console.log('[db-migration] Applied migrations:', appliedTags.join(', '))
    }
    else {
      console.log('[db-migration] Schema up to date, no new migrations')
    }

    client.close()
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[db-migration] Migration failed:', message)
    throw new Error(`Database migration failed: ${message}`)
  }
})
