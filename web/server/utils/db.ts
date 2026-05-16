import { existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../database/schema'

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (!_db) {
    const config = useRuntimeConfig()
    const dbPath = resolve(config.sqliteDatabasePath as string)
    const dir = dirname(dbPath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    const sqlite = new Database(dbPath)
    _db = drizzle(sqlite, { schema })
  }
  return _db
}
