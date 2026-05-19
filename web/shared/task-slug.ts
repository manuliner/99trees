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
  let source = ''
  if (activity.type === 'quiz') {
    source = localizedStringPrimaryText(activity.question ?? { de: '', en: '' }).trim()
  }
  else if (activity.type === 'coop') {
    source = localizedStringPrimaryText(activity.instructions ?? { de: '', en: '' }).trim()
  }
  else if (activity.type === 'media') {
    source = localizedStringPrimaryText(activity.text ?? { de: '', en: '' }).trim()
  }
  else {
    source = localizedStringPrimaryText(activity.text ?? { de: '', en: '' }).trim()
  }
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
  if (task.activityPayload.type === 'quiz') {
    return localizedStringPrimaryText(task.activityPayload.question)
  }
  if (task.activityPayload.type === 'coop') {
    return localizedStringPrimaryText(task.activityPayload.instructions)
  }
  if (task.activityPayload.type === 'media') {
    return localizedStringPrimaryText(task.activityPayload.text)
  }
  return localizedStringPrimaryText(task.activityPayload.text)
}

export type AdminTaskFieldTooltip = {
  activityType: 'quiz' | 'performance' | 'coop' | 'media'
  text: string
}

export function adminTaskFieldTooltip(task: AdminTask): AdminTaskFieldTooltip | null {
  const text = adminTaskHoverText(task).trim()
  if (!text) return null
  return { activityType: task.activityType, text }
}
