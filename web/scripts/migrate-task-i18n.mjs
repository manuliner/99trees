import Database from 'better-sqlite3'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const webRoot = resolve(__dirname, '..')
const dbPath = process.env.NUXT_SQLITE_DATABASE_PATH
  ? resolve(process.env.NUXT_SQLITE_DATABASE_PATH)
  : join(webRoot, 'server/database/db.sqlite')

function wrapPlainString(value) {
  const trimmed = String(value ?? '').trim()
  return JSON.stringify({ de: trimmed, en: trimmed })
}

function isLocalizedJson(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed.startsWith('{')) return false
  try {
    const parsed = JSON.parse(trimmed)
    return typeof parsed.de === 'string' && typeof parsed.en === 'string'
  }
  catch {
    return false
  }
}

function wrapLocalizedField(value) {
  if (isLocalizedJson(value)) return value
  return wrapPlainString(value)
}

function wrapLocalizedStringList(value) {
  if (Array.isArray(value)) {
    const trimmed = value.map((item) => String(item).trim()).filter(Boolean)
    return { de: trimmed, en: trimmed }
  }
  if (value && typeof value === 'object' && Array.isArray(value.de) && Array.isArray(value.en)) {
    return value
  }
  return { de: [], en: [] }
}

function migrateActivityPayload(raw) {
  const payload = JSON.parse(raw)
  if (payload.type === 'performance') {
    payload.text = wrapLocalizedField(
      typeof payload.text === 'string' ? payload.text : JSON.stringify(payload.text ?? ''),
    )
    if (typeof payload.text === 'string' && payload.text.startsWith('{')) {
      payload.text = JSON.parse(payload.text)
    }
    else if (typeof payload.text === 'string') {
      payload.text = { de: payload.text, en: payload.text }
    }
    return JSON.stringify(payload)
  }

  if (typeof payload.question === 'string') {
    payload.question = { de: payload.question, en: payload.question }
  }
  else if (typeof payload.question === 'object' && payload.question) {
    payload.question = {
      de: String(payload.question.de ?? '').trim(),
      en: String(payload.question.en ?? '').trim(),
    }
  }

  payload.answers = wrapLocalizedStringList(payload.answers)
  if (payload.choices !== undefined) {
    payload.choices = wrapLocalizedStringList(payload.choices)
  }

  return JSON.stringify(payload)
}

const db = new Database(dbPath)
const rows = db.prepare('SELECT id, hint_vague, hint_level_1, hint_level_2, activity_payload_json FROM tasks').all()

const update = db.prepare(`
  UPDATE tasks
  SET hint_vague = ?, hint_level_1 = ?, hint_level_2 = ?, activity_payload_json = ?
  WHERE id = ?
`)

let migrated = 0
for (const row of rows) {
  update.run(
    wrapLocalizedField(row.hint_vague),
    wrapLocalizedField(row.hint_level_1),
    wrapLocalizedField(row.hint_level_2),
    migrateActivityPayload(row.activity_payload_json),
    row.id,
  )
  migrated += 1
}

db.close()
console.log(`Migrated ${migrated} task row(s) to localized content.`)
