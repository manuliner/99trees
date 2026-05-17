import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../database/schema'
import { resolveSqliteDatabasePath } from './resolve-sqlite-path'

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (!_db) {
    const config = useRuntimeConfig()
    const dbPath = resolveSqliteDatabasePath(config.sqliteDatabasePath as string | undefined)
    const dir = dirname(dbPath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    const sqlite = new Database(dbPath)
    _db = drizzle(sqlite, { schema })
  }
  return _db
}
