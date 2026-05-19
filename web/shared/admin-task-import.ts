import type { AdminTaskInput } from './schemas'
import type { AdminTask } from './types'
import { resolveTaskSlug, slugifyTaskText } from './task-slug'

export function normalizeImportSlug(slug: string): string {
  return slugifyTaskText(slug)
}

export function adminTaskToImportInput(task: AdminTask): AdminTaskInput {
  const activity =
    task.activityPayload.type === 'quiz'
      ? {
          type: 'quiz' as const,
          question: task.activityPayload.question,
          ...(task.activityPayload.inputMode
            ? { inputMode: task.activityPayload.inputMode }
            : {}),
          ...(task.activityPayload.choices ? { choices: task.activityPayload.choices } : {}),
          answers: task.activityPayload.answers,
        }
      : task.activityPayload.type === 'coop'
        ? {
            type: 'coop' as const,
            instructions: task.activityPayload.instructions,
            partnerInstructions: task.activityPayload.partnerInstructions,
          }
        : task.activityPayload.type === 'media'
          ? {
              type: 'media' as const,
              text: task.activityPayload.text,
              allowedKinds: task.activityPayload.allowedKinds,
              ...(task.activityPayload.maxDurationSec != null
                ? { maxDurationSec: task.activityPayload.maxDurationSec }
                : {}),
            }
          : {
              type: 'performance' as const,
              text: task.activityPayload.text,
            }
  return {
    field: task.fieldNumber,
    slug: task.slug,
    hint_vague: task.hintVague,
    hint_level_1: task.hintLevel1,
    hint_level_2: task.hintLevel2,
    map: { x: task.mapX, y: task.mapY },
    activity,
  }
}

export function adminTasksToImportDocument(tasks: AdminTask[]) {
  return {
    tasks: tasks.map(adminTaskToImportInput),
  }
}

/** Resolved import slug for one task (explicit or generated). */
export function resolveImportItemSlug(
  item: AdminTaskInput,
  usedSlugs: Set<string>,
): string {
  return resolveTaskSlug(item.field, item.activity, item.slug, usedSlugs)
}

/**
 * Returns normalized slugs that appear more than once in the import batch.
 */
export function findDuplicateImportSlugs(tasks: AdminTaskInput[]): string[] {
  const usedSlugs = new Set<string>()
  const seen = new Map<string, number>()
  for (const item of tasks) {
    const slug = normalizeImportSlug(resolveImportItemSlug(item, usedSlugs))
    seen.set(slug, (seen.get(slug) ?? 0) + 1)
  }
  return [...seen.entries()].filter(([, count]) => count > 1).map(([slug]) => slug)
}
