import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const webRoot = resolve(__dirname, '..')
const dbPath = process.env.NUXT_SQLITE_DATABASE_PATH
  ? resolve(process.env.NUXT_SQLITE_DATABASE_PATH)
  : join(webRoot, 'server/database/db.sqlite')
const migrationsFolder = join(webRoot, 'server/database/migrations')

mkdirSync(dirname(dbPath), { recursive: true })

const client = new Database(dbPath)
const db = drizzle(client)

if (existsSync(migrationsFolder)) {
  migrate(db, { migrationsFolder })
}

const DEFAULT_CONFIG = {
  diceMin: 1,
  diceMax: 6,
  hintTimerMinutes: [3, 6, 9],
  hintCosts: { wait: [10, 12, 15], revealAll: 50 },
  performanceTimeoutMinutes: 10,
}

const FIELD_COUNT = 10
const now = Date.now()

client.exec('DELETE FROM crew_ratings')
client.exec('DELETE FROM turns')
client.exec('DELETE FROM teams')
client.exec('DELETE FROM stations')
client.exec('DELETE FROM editions')

const crewHash = await bcrypt.hash('crew1234', 10)

const editionResult = client
  .prepare(
    `INSERT INTO editions (name, field_count, status, config_json, crew_password_hash, created_at)
     VALUES (?, ?, 'live', ?, ?, ?)`,
  )
  .run('Zugvögel Demo', FIELD_COUNT, JSON.stringify(DEFAULT_CONFIG), crewHash, now)

const editionId = editionResult.lastInsertRowid

const insertStation = client.prepare(
  `INSERT INTO stations (
    edition_id, field_number, slug, hint_vague, hint_level_1, hint_level_2,
    map_x, map_y, qr_token, task_type, task_payload_json
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'quiz', ?)`,
)

for (let n = 1; n <= FIELD_COUNT; n++) {
  const slug = `field-${n}`
  const token = randomBytes(8).toString('hex')
  const payload = JSON.stringify({
    type: 'quiz',
    question: `Demo question for field ${n}?`,
    answers: [`answer${n}`, `field${n}`],
  })
  insertStation.run(
    editionId,
    n,
    slug,
    `A vague clue for field ${n}`,
    `Warmer hint for field ${n}`,
    `Hot hint: near map tile (${n * 10}, ${n * 5})`,
    n * 10,
    n * 5,
    token,
    payload,
  )
  console.log(`Station ${n}: /s/${slug}?t=${token}  (answers: answer${n}, field${n})`)
}

client.close()
console.log('\nSeed complete.')
console.log(`Edition id: ${editionId} (live, ${FIELD_COUNT} fields)`)
console.log('Crew password: crew1234')
console.log(`Join: http://localhost:3000/join?edition=${editionId}`)
