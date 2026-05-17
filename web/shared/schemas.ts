import { z } from 'zod'

const editionIdField = z.coerce.number().int().positive()

export const createTeamSchema = z.object({
  editionId: editionIdField,
  name: z.string().trim().min(3).max(32),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
  size: z.number().int().min(1).max(5).optional(),
})

export const rejoinTeamSchema = z.object({
  editionId: editionIdField,
  name: z.string().trim().min(3).max(32),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
})

export const rollSchema = z.object({})

export const hintSchema = z.object({
  level: z.number().int().min(1).max(3).optional(),
  mode: z.enum(['reveal_all']).optional(),
})

export const answerSchema = z.object({
  answer: z.string().trim().min(1).max(500),
})

export const crewRateSchema = z.object({
  teamId: z.number().int().positive(),
  turnId: z.number().int().positive(),
  rating: z.enum(['ok', 'bonus']),
})

export const adminStationTaskSchema = z.object({
  type: z.enum(['quiz', 'performance']),
  question: z.string().optional(),
  answers: z.array(z.string()).optional(),
  text: z.string().optional(),
})

const optionalStationSlug = z.preprocess(
  (v) => (typeof v === 'string' && !v.trim() ? undefined : v),
  z.string().min(1).optional(),
)

export const adminStationInputSchema = z.object({
  field: z.number().int().positive(),
  slug: optionalStationSlug,
  hint_vague: z.string().min(1),
  hint_medium: z.string().optional(),
  hint_level_1: z.string().optional(),
  hint_level_2: z.string().optional(),
  map: z.object({ x: z.number(), y: z.number() }).optional(),
  task: adminStationTaskSchema,
})

export const adminStationsImportSchema = z.object({
  stations: z.array(adminStationInputSchema).min(1),
})

export const adminStationCreateSchema = z.object({
  field: z.number().int().positive(),
  hint_vague: z.string().min(1),
  hint_medium: z.string().optional(),
  hint_level_1: z.string().optional(),
  hint_level_2: z.string().optional(),
  map: z.object({ x: z.number(), y: z.number() }).optional(),
  task: adminStationTaskSchema,
  slug: optionalStationSlug,
})

export const adminStationPatchSchema = z.object({
  slug: optionalStationSlug,
  hint_vague: z.string().min(1),
  hint_medium: z.string().optional(),
  hint_level_1: z.string().optional(),
  hint_level_2: z.string().optional(),
  map: z.object({ x: z.number(), y: z.number() }),
  task: adminStationTaskSchema,
})

export type AdminStationPatchInput = z.infer<typeof adminStationPatchSchema>
export type AdminStationCreateInput = z.infer<typeof adminStationCreateSchema>
export type AdminStationInput = z.infer<typeof adminStationInputSchema>
