import type { AdminStationInput } from '#shared/schemas'
import {
  findDuplicateImportSlugs,
  normalizeImportSlug,
  resolveImportItemSlug,
} from '#shared/admin-station-import'
import type { stations } from '../database/schema'

type StationRow = typeof stations.$inferSelect

export interface ImportStationPlan {
  item: AdminStationInput
  slug: string
  normalizedSlug: string
  existing: StationRow | undefined
}

export function planStationImport(
  items: AdminStationInput[],
  existingRows: StationRow[],
): ImportStationPlan[] {
  const duplicates = findDuplicateImportSlugs(items)
  if (duplicates.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Duplicate slugs in import: ${duplicates.join(', ')}`,
    })
  }

  const existingBySlug = new Map<string, StationRow>()
  for (const row of existingRows) {
    existingBySlug.set(normalizeImportSlug(row.slug), row)
  }

  const usedSlugs = new Set(existingRows.map((r) => r.slug))
  const plans: ImportStationPlan[] = []

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
  plans: ImportStationPlan[],
  existingRows: StationRow[],
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
