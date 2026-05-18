import type Database from 'better-sqlite3'

function wrapPlainString(value: unknown): string {
  const trimmed = String(value ?? '').trim()
  return JSON.stringify({ de: trimmed, en: trimmed })
}

function isLocalizedJson(value: unknown): boolean {
  const trimmed = String(value ?? '').trim()
  if (!trimmed.startsWith('{')) return false
  try {
    const parsed = JSON.parse(trimmed) as { de?: unknown, en?: unknown }
    return typeof parsed.de === 'string' && typeof parsed.en === 'string'
  }
  catch {
    return false
  }
}

function wrapLocalizedField(value: unknown): string {
  if (isLocalizedJson(value)) return String(value)
  return wrapPlainString(value)
}

function wrapLocalizedStringList(value: unknown): { de: string[], en: string[] } {
  if (Array.isArray(value)) {
    const trimmed = value.map((item) => String(item).trim()).filter(Boolean)
    return { de: trimmed, en: trimmed }
  }
  if (value && typeof value === 'object') {
    const record = value as { de?: unknown, en?: unknown }
    if (Array.isArray(record.de) && Array.isArray(record.en)) {
      return {
        de: record.de.filter((item): item is string => typeof item === 'string'),
        en: record.en.filter((item): item is string => typeof item === 'string'),
      }
    }
  }
  return { de: [], en: [] }
}

function migrateActivityPayload(raw: string): string {
  const payload = JSON.parse(raw) as Record<string, unknown>
  if (payload.type === 'performance') {
    if (typeof payload.text === 'string') {
      payload.text = { de: payload.text, en: payload.text }
    }
    else if (payload.text && typeof payload.text === 'object') {
      const text = payload.text as { de?: string, en?: string }
      payload.text = {
        de: String(text.de ?? '').trim(),
        en: String(text.en ?? '').trim(),
      }
    }
    return JSON.stringify(payload)
  }

  if (typeof payload.question === 'string') {
    payload.question = { de: payload.question, en: payload.question }
  }
  else if (payload.question && typeof payload.question === 'object') {
    const question = payload.question as { de?: string, en?: string }
    payload.question = {
      de: String(question.de ?? '').trim(),
      en: String(question.en ?? '').trim(),
    }
  }

  payload.answers = wrapLocalizedStringList(payload.answers)
  if (payload.choices !== undefined) {
    payload.choices = wrapLocalizedStringList(payload.choices)
  }

  return JSON.stringify(payload)
}

export function migrateTaskContentToI18n(client: Database.Database): number {
  const rows = client
    .prepare('SELECT id, hint_vague, hint_level_1, hint_level_2, activity_payload_json FROM tasks')
    .all() as Array<{
    id: number
    hint_vague: string
    hint_level_1: string
    hint_level_2: string
    activity_payload_json: string
  }>

  const update = client.prepare(`
    UPDATE tasks
    SET hint_vague = ?, hint_level_1 = ?, hint_level_2 = ?, activity_payload_json = ?
    WHERE id = ?
  `)

  let migrated = 0
  for (const row of rows) {
    const nextHintVague = wrapLocalizedField(row.hint_vague)
    const nextHintLevel1 = wrapLocalizedField(row.hint_level_1)
    const nextHintLevel2 = wrapLocalizedField(row.hint_level_2)
    const nextPayload = migrateActivityPayload(row.activity_payload_json)
    const changed =
      nextHintVague !== row.hint_vague
      || nextHintLevel1 !== row.hint_level_1
      || nextHintLevel2 !== row.hint_level_2
      || nextPayload !== row.activity_payload_json
    if (!changed) continue

    update.run(nextHintVague, nextHintLevel1, nextHintLevel2, nextPayload, row.id)
    migrated += 1
  }

  return migrated
}
