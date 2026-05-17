import type { AdminStationInput, AdminStationPatchInput } from '#shared/schemas'
import type { AdminStation, StationTaskPayload } from '#shared/types'
import type { stations } from '../database/schema'

type StationRow = typeof stations.$inferSelect

export function buildTaskPayloadJson(task: AdminStationInput['task'] | AdminStationPatchInput['task']): string {
  const payload: StationTaskPayload =
    task.type === 'quiz'
      ? { type: 'quiz', question: task.question ?? '', answers: task.answers ?? [] }
      : { type: 'performance', text: task.text ?? '' }
  return JSON.stringify(payload)
}

export function resolveHintLevels(input: {
  hint_vague: string
  hint_medium?: string
  hint_level_1?: string
  hint_level_2?: string
}): { hintLevel1: string; hintLevel2: string } {
  return {
    hintLevel1: input.hint_level_1 ?? input.hint_medium ?? input.hint_vague,
    hintLevel2: input.hint_level_2 ?? input.hint_medium ?? input.hint_vague,
  }
}

export function stationRowToAdminStation(row: StationRow): AdminStation {
  const taskPayload = JSON.parse(row.taskPayloadJson) as StationTaskPayload
  return {
    id: row.id,
    fieldNumber: row.fieldNumber,
    slug: row.slug,
    hintVague: row.hintVague,
    hintLevel1: row.hintLevel1,
    hintLevel2: row.hintLevel2,
    mapX: row.mapX,
    mapY: row.mapY,
    taskType: row.taskType as 'quiz' | 'performance',
    taskPayload,
  }
}
