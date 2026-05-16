import { defineNitroPlugin } from 'nitropack/runtime'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

function resolveMigrationsFolder(): string | null {
  const candidates = [
    join(process.cwd(), 'server', 'database', 'migrations'),
    join(process.cwd(), 'web', 'server', 'database', 'migrations'),
    resolve(process.cwd(), 'migrations'),
  ]
  for (const dir of candidates) {
    if (existsSync(dir)) return dir
  }
  return null
}

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  const databasePath = resolve(config.sqliteDatabasePath as string)
  const migrationsFolder = resolveMigrationsFolder()
  if (!migrationsFolder) {
    console.warn('[db-migration] No migrations folder found')
    return
  }

  const client = new Database(databasePath)
  const db = drizzle(client)
  migrate(db, { migrationsFolder })
  client.close()
  console.log('[db-migration] Migrations applied from', migrationsFolder)
})
