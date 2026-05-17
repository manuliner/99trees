import type { z } from 'zod'
import type { adminStationTaskSchema } from './schemas'
import type { AdminStation, StationTaskPayload } from './types'

type StationTask = z.infer<typeof adminStationTaskSchema>

export function slugifyStationText(text: string): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug || 'station'
}

export function stationSlugBaseFromTask(field: number, task: StationTask | StationTaskPayload): string {
  const source =
    task.type === 'quiz' ? (task.question ?? '').trim() : (task.text ?? '').trim()
  return slugifyStationText(source) || `field-${field}`
}

export function ensureUniqueStationSlug(base: string, used: Set<string>): string {
  const normalized = slugifyStationText(base) || base
  if (!used.has(normalized)) {
    used.add(normalized)
    return normalized
  }
  let n = 2
  while (used.has(`${normalized}-${n}`)) n++
  const slug = `${normalized}-${n}`
  used.add(slug)
  return slug
}

export function resolveStationSlug(
  field: number,
  task: StationTask | StationTaskPayload,
  explicitSlug: string | undefined | null,
  used: Set<string>,
): string {
  const trimmed = explicitSlug?.trim()
  if (trimmed) {
    return ensureUniqueStationSlug(trimmed, used)
  }
  return ensureUniqueStationSlug(stationSlugBaseFromTask(field, task), used)
}

export function adminStationHoverText(station: AdminStation): string {
  return station.taskPayload.type === 'quiz'
    ? station.taskPayload.question
    : station.taskPayload.text
}

export type AdminStationFieldTooltip = {
  taskType: 'quiz' | 'performance'
  text: string
}

export function adminStationFieldTooltip(station: AdminStation): AdminStationFieldTooltip | null {
  const text = adminStationHoverText(station).trim()
  if (!text) return null
  return { taskType: station.taskType, text }
}
