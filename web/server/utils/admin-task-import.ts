import { eq, inArray } from 'drizzle-orm'
import type { AdminTaskInput } from '#shared/schemas'
import {
  findDuplicateImportSlugs,
  normalizeImportSlug,
  resolveImportItemSlug,
} from '#shared/admin-task-import'
import { tasks, turns } from '../database/schema'
import type { getDb } from './db'

type TaskRow = typeof tasks.$inferSelect
type Db = ReturnType<typeof getDb>

/** Temporary field numbers while overwrite import frees target slots (must stay positive). */
const TEMP_FIELD_BASE = 100_000

export interface ImportTaskPlan {
  item: AdminTaskInput
  slug: string
  normalizedSlug: string
  existing: TaskRow | undefined
}

export function planTaskImport(
  items: AdminTaskInput[],
  existingRows: TaskRow[],
): ImportTaskPlan[] {
  const duplicates = findDuplicateImportSlugs(items)
  if (duplicates.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Duplicate slugs in import: ${duplicates.join(', ')}`,
    })
  }

  const existingBySlug = new Map<string, TaskRow>()
  for (const row of existingRows) {
    existingBySlug.set(normalizeImportSlug(row.slug), row)
  }

  const usedSlugs = new Set(existingRows.map((r) => r.slug))
  const plans: ImportTaskPlan[] = []

  for (const item of items) {
    const slug = resolveImportItemSlug(item, usedSlugs)
    const normalizedSlug = normalizeImportSlug(slug)
    plans.push({
      item,
      slug,
      normalizedSlug,
      existing: existingBySlug.get(normalizedSlug),
    })
  }

  return plans
}

export function assertNoFieldConflicts(
  plans: ImportTaskPlan[],
  existingRows: TaskRow[],
): void {
  const fieldToSlug = new Map<number, string>()
  for (const row of existingRows) {
    fieldToSlug.set(row.fieldNumber, row.slug)
  }

  for (const plan of plans) {
    const oldField = plan.existing?.fieldNumber
    if (oldField != null && fieldToSlug.get(oldField) === plan.slug) {
      fieldToSlug.delete(oldField)
    }

    const occupant = fieldToSlug.get(plan.item.field)
    if (occupant != null && occupant !== plan.slug) {
      throw createError({
        statusCode: 409,
        statusMessage: `Field ${plan.item.field} already used by slug "${occupant}"`,
      })
    }
    fieldToSlug.set(plan.item.field, plan.slug)
  }
}

export function importNormalizedSlugSet(plans: ImportTaskPlan[]): Set<string> {
  return new Set(plans.map((p) => p.normalizedSlug))
}

export function taskIdsMissingFromImport(
  existingRows: TaskRow[],
  importSlugs: Set<string>,
): number[] {
  return existingRows
    .filter((row) => !importSlugs.has(normalizeImportSlug(row.slug)))
    .map((row) => row.id)
}

/** Move tasks that will be updated to unused field numbers so targets can be reassigned. */
export async function stageExistingTasksForOverwrite(
  db: Db,
  plans: ImportTaskPlan[],
): Promise<void> {
  let index = 0
  for (const plan of plans) {
    if (!plan.existing) continue
    await db
      .update(tasks)
      .set({ fieldNumber: TEMP_FIELD_BASE + index })
      .where(eq(tasks.id, plan.existing.id))
    index++
  }
}

export async function deleteEditionTasks(db: Db, taskIds: number[]): Promise<number> {
  if (taskIds.length === 0) return 0
  await db.update(turns).set({ taskId: null }).where(inArray(turns.taskId, taskIds))
  await db.delete(tasks).where(inArray(tasks.id, taskIds))
  return taskIds.length
}
