import type { AdminTaskInput, AdminTaskPatchInput } from '#shared/schemas'
import type { ActivityPayload, AdminTask } from '#shared/types'
import {
  parseLocalizedString,
  serializeLocalizedString,
  type LocalizedString,
} from '#shared/localized'
import {
  buildCoopActivityPayload,
  buildMediaActivityPayload,
  buildPerformanceActivityPayload,
  buildQuizActivityPayload,
  parseActivityPayload,
} from '#shared/quiz-payload'
import type { tasks } from '../database/schema'

type TaskRow = typeof tasks.$inferSelect

export function buildActivityPayloadJson(
  activity: AdminTaskInput['activity'] | AdminTaskPatchInput['activity'],
): string {
  const payload: ActivityPayload =
    activity.type === 'quiz'
      ? buildQuizActivityPayload({
          type: 'quiz',
          question: activity.question!,
          ...(activity.inputMode ? { inputMode: activity.inputMode } : {}),
          ...(activity.choices ? { choices: activity.choices } : {}),
          answers: activity.answers!,
        })
      : activity.type === 'coop'
        ? buildCoopActivityPayload({
            type: 'coop',
            instructions: activity.instructions!,
            partnerInstructions: activity.partnerInstructions!,
          })
        : activity.type === 'media'
          ? buildMediaActivityPayload({
              type: 'media',
              text: activity.text!,
              allowedKinds: activity.allowedKinds ?? ['photo'],
              ...(activity.maxDurationSec != null ? { maxDurationSec: activity.maxDurationSec } : {}),
            })
          : buildPerformanceActivityPayload({
              type: 'performance',
              text: activity.text!,
            })
  return JSON.stringify(payload)
}

export function serializeHint(value: LocalizedString): string {
  return serializeLocalizedString(value)
}

export function parseHintColumn(raw: string): LocalizedString {
  return parseLocalizedString(raw)
}

export function resolveHintLevels(input: {
  hint_vague: LocalizedString
  hint_medium?: LocalizedString
  hint_level_1?: LocalizedString
  hint_level_2?: LocalizedString
}): { hintLevel1: LocalizedString; hintLevel2: LocalizedString } {
  return {
    hintLevel1: input.hint_level_1 ?? input.hint_medium ?? input.hint_vague,
    hintLevel2: input.hint_level_2 ?? input.hint_medium ?? input.hint_vague,
  }
}

export function taskRowToAdminTask(row: TaskRow): AdminTask {
  const activityPayload = parseActivityPayload(JSON.parse(row.activityPayloadJson))
  return {
    id: row.id,
    fieldNumber: row.fieldNumber,
    slug: row.slug,
    hintVague: parseHintColumn(row.hintVague),
    hintLevel1: parseHintColumn(row.hintLevel1),
    hintLevel2: parseHintColumn(row.hintLevel2),
    mapX: row.mapX,
    mapY: row.mapY,
    activityType: row.activityType as 'quiz' | 'performance' | 'coop' | 'media',
    activityPayload,
  }
}
