import type { AdminStationInput } from './schemas'
import type { AdminStation } from './types'
import { resolveStationSlug, slugifyStationText } from './station-slug'

export function normalizeImportSlug(slug: string): string {
  return slugifyStationText(slug)
}

export function adminStationToImportInput(station: AdminStation): AdminStationInput {
  const task =
    station.taskPayload.type === 'quiz'
      ? {
          type: 'quiz' as const,
          question: station.taskPayload.question,
          answers: station.taskPayload.answers,
        }
      : {
          type: 'performance' as const,
          text: station.taskPayload.text,
        }
  return {
    field: station.fieldNumber,
    slug: station.slug,
    hint_vague: station.hintVague,
    hint_level_1: station.hintLevel1,
    hint_level_2: station.hintLevel2,
    map: { x: station.mapX, y: station.mapY },
    task,
  }
}

export function adminStationsToImportDocument(stations: AdminStation[]) {
  return {
    stations: stations.map(adminStationToImportInput),
  }
}

/** Resolved import slug for one station (explicit or generated). */
export function resolveImportItemSlug(
  item: AdminStationInput,
  usedSlugs: Set<string>,
): string {
  return resolveStationSlug(item.field, item.task, item.slug, usedSlugs)
}

/**
 * Returns normalized slugs that appear more than once in the import batch.
 */
export function findDuplicateImportSlugs(stations: AdminStationInput[]): string[] {
  const usedSlugs = new Set<string>()
  const seen = new Map<string, number>()
  for (const item of stations) {
    const slug = normalizeImportSlug(resolveImportItemSlug(item, usedSlugs))
    seen.set(slug, (seen.get(slug) ?? 0) + 1)
  }
  return [...seen.entries()].filter(([, count]) => count > 1).map(([slug]) => slug)
}
