import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildActivityPayload,
  resolveHintLevels,
  serializeLocalizedString,
} from './seed-task-i18n.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const webRoot = resolve(__dirname, '..')
const dbPath = process.env.NUXT_SQLITE_DATABASE_PATH
  ? resolve(process.env.NUXT_SQLITE_DATABASE_PATH)
  : join(webRoot, 'server/database/db.sqlite')
const migrationsFolder = join(webRoot, 'server/database/migrations')
const demoTasksPath = join(webRoot, 'data/demo-tasks.json')
const demoLegacyPath = join(webRoot, 'data/demo-stations.json')
const festivalMapSource = join(webRoot, 'data/festival-map.png')

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

const demoPath = existsSync(demoTasksPath) ? demoTasksPath : demoLegacyPath
const demo = JSON.parse(readFileSync(demoPath, 'utf8'))
const items = demo.tasks ?? demo.stations ?? []
const fieldCount = Math.max(...items.map((s) => s.field))
const now = Date.now()

client.exec('DELETE FROM crew_ratings')
client.exec('DELETE FROM turns')
client.exec('DELETE FROM teams')
client.exec('DELETE FROM tasks')
client.exec('DELETE FROM editions')

const crewHash = await bcrypt.hash('crew1234', 10)

const editionResult = client
  .prepare(
    `INSERT INTO editions (name, slug, field_count, status, config_json, crew_password_hash, map_image_path, created_at)
     VALUES (?, ?, ?, 'live', ?, ?, NULL, ?)`,
  )
  .run('Zugvögel Demo', 'zv26', fieldCount, JSON.stringify(DEFAULT_CONFIG), crewHash, now)

const editionId = editionResult.lastInsertRowid

const uploadDir = join(dirname(dbPath), 'uploads', 'editions')
mkdirSync(uploadDir, { recursive: true })
const mapFilename = `${editionId}.png`
const mapDest = join(uploadDir, mapFilename)
if (existsSync(festivalMapSource)) {
  copyFileSync(festivalMapSource, mapDest)
  const mapImagePath = `/api/uploads/editions/${mapFilename}`
  client.prepare('UPDATE editions SET map_image_path = ? WHERE id = ?').run(mapImagePath, editionId)
  console.log(`Festival map: ${mapImagePath}`)
}
else {
  console.warn('No web/data/festival-map.png — upload map in admin before going live')
}

const insertTask = client.prepare(
  `INSERT INTO tasks (
    edition_id, field_number, slug, hint_vague, hint_level_1, hint_level_2,
    map_x, map_y, qr_token, activity_type, activity_payload_json
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
)

for (const s of items) {
  const token = randomBytes(8).toString('hex')
  const activityRaw = s.activity ?? s.task
  const activity = buildActivityPayload(activityRaw, s)
  const hints = resolveHintLevels(s)

  insertTask.run(
    editionId,
    s.field,
    s.slug,
    serializeLocalizedString(hints.hintVague),
    serializeLocalizedString(hints.hintLevel1),
    serializeLocalizedString(hints.hintLevel2),
    s.map?.x ?? s.field * 2,
    s.map?.y ?? 50,
    token,
    activity.type,
    JSON.stringify(activity),
  )
  const answers =
    activity.type === 'quiz'
      ? `${activity.answers.de.join(', ')} / ${activity.answers.en.join(', ')}`
      : activity.type === 'media'
        ? `(media — ${(activity.allowedKinds ?? ['photo']).join(', ')})`
        : '(performance — crew rates)'
  const taskUrl = `/s/${encodeURIComponent(s.slug)}?t=${token}`
  console.log(`Task ${s.field}: ${taskUrl}  (${answers})`)
}

client.close()
console.log('\nSeed complete.')
console.log(`Edition id: ${editionId} (live, ${fieldCount} fields)`)
console.log('Crew password: crew1234')
console.log('Join: http://localhost:3000/zv26')
