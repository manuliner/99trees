import type { z } from 'zod'
import { localizedStringPrimaryText } from './localized'
import type { adminTaskActivitySchema } from './schemas'
import type { ActivityPayload, AdminTask } from './types'

type TaskActivity = z.infer<typeof adminTaskActivitySchema>

export function slugifyTaskText(text: string): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug || 'task'
}

export function taskSlugBaseFromActivity(field: number, activity: TaskActivity | ActivityPayload): string {
  const source =
    activity.type === 'quiz'
      ? localizedStringPrimaryText(activity.question ?? { de: '', en: '' }).trim()
      : localizedStringPrimaryText(activity.text ?? { de: '', en: '' }).trim()
  return slugifyTaskText(source) || `field-${field}`
}

export function ensureUniqueTaskSlug(base: string, used: Set<string>): string {
  const normalized = slugifyTaskText(base) || base
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

export function resolveTaskSlug(
  field: number,
  activity: TaskActivity | ActivityPayload,
  explicitSlug: string | undefined | null,
  used: Set<string>,
): string {
  const trimmed = explicitSlug?.trim()
  if (trimmed) {
    return ensureUniqueTaskSlug(trimmed, used)
  }
  return ensureUniqueTaskSlug(taskSlugBaseFromActivity(field, activity), used)
}

export function adminTaskHoverText(task: AdminTask): string {
  return task.activityPayload.type === 'quiz'
    ? localizedStringPrimaryText(task.activityPayload.question)
    : localizedStringPrimaryText(task.activityPayload.text)
}

export type AdminTaskFieldTooltip = {
  activityType: 'quiz' | 'performance'
  text: string
}

export function adminTaskFieldTooltip(task: AdminTask): AdminTaskFieldTooltip | null {
  const text = adminTaskHoverText(task).trim()
  if (!text) return null
  return { activityType: task.activityType, text }
}
