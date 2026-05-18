import { z } from 'zod'
import {
  isCompleteLocalizedString,
  isCompleteLocalizedStringList,
  normalizeLocalizedString,
  normalizeLocalizedStringList,
} from './localized'

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
  locale: z.enum(['de', 'en']),
})

export const crewRateSchema = z.object({
  teamId: z.number().int().positive(),
  turnId: z.number().int().positive(),
  rating: z.enum(['ok', 'bonus']),
})

const localizedStringObjectSchema = z
  .object({
    de: z.string().trim().min(1),
    en: z.string().trim().min(1),
  })
  .transform((value) => normalizeLocalizedString(value))

export const localizedStringSchema = z.union([
  localizedStringObjectSchema,
  z.string().trim().min(1).transform((value) => normalizeLocalizedString(value)),
])

export const localizedStringListSchema = z.union([
  z
    .object({
      de: z.array(z.string()),
      en: z.array(z.string()),
    })
    .transform((value) => normalizeLocalizedStringList(value))
    .superRefine((value, ctx) => {
      if (!isCompleteLocalizedStringList(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Both de and en must include at least one non-empty value',
        })
      }
    }),
  z
    .array(z.string())
    .transform((value) => normalizeLocalizedStringList(value))
    .superRefine((value, ctx) => {
      if (!isCompleteLocalizedStringList(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Both de and en must include at least one non-empty value',
        })
      }
    }),
])

export const adminTaskActivitySchema = z
  .object({
    type: z.enum(['quiz', 'performance']),
    question: localizedStringSchema.optional(),
    inputMode: z.enum(['freeText', 'multipleChoice']).optional(),
    choices: localizedStringListSchema.optional(),
    answers: localizedStringListSchema.optional(),
    text: localizedStringSchema.optional(),
  })
  .superRefine((activity, ctx) => {
    if (activity.type === 'performance') {
      if (!activity.text || !isCompleteLocalizedString(activity.text)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Performance text is required in de and en',
          path: ['text'],
        })
      }
      return
    }

    if (!activity.question || !isCompleteLocalizedString(activity.question)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Quiz question is required in de and en',
        path: ['question'],
      })
    }

    const inputMode = activity.inputMode ?? 'freeText'
    const answers = activity.answers ?? { de: [], en: [] }

    if (inputMode === 'freeText') {
      if (!isCompleteLocalizedStringList(answers)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least one accepted answer is required in de and en',
          path: ['answers'],
        })
      }
      return
    }

    const choices = activity.choices ?? { de: [], en: [] }
    for (const locale of ['de', 'en'] as const) {
      const localeChoices = choices[locale].map((c) => c.trim()).filter(Boolean)
      const localeAnswers = answers[locale].map((a) => a.trim()).filter(Boolean)
      if (localeChoices.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Multiple choice requires at least two options for ${locale}`,
          path: ['choices', locale],
        })
      }
      if (localeAnswers.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Multiple choice requires exactly one correct answer for ${locale}`,
          path: ['answers', locale],
        })
        continue
      }
      const correct = localeAnswers[0]!
      const matchesChoice = localeChoices.some(
        (c) => c.trim().toLowerCase() === correct.toLowerCase(),
      )
      if (!matchesChoice) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Correct answer must match one of the choices for ${locale}`,
          path: ['answers', locale],
        })
      }
    }
  })

const optionalTaskSlug = z.preprocess(
  (v) => (typeof v === 'string' && !v.trim() ? undefined : v),
  z.string().min(1).optional(),
)

const adminTaskHintsSchema = z.object({
  hint_vague: localizedStringSchema,
  hint_medium: localizedStringSchema.optional(),
  hint_level_1: localizedStringSchema.optional(),
  hint_level_2: localizedStringSchema.optional(),
})

export const adminTaskInputSchema = z
  .object({
    field: z.number().int().positive(),
    slug: optionalTaskSlug,
    map: z.object({ x: z.number(), y: z.number() }).optional(),
    activity: adminTaskActivitySchema,
  })
  .and(adminTaskHintsSchema)

export const adminTasksImportSchema = z.object({
  tasks: z.array(adminTaskInputSchema).min(1),
  /** When true, removes edition tasks not in the file and allows field moves/swaps. */
  overwrite: z.boolean().optional().default(false),
})

export const adminTaskCreateSchema = z
  .object({
    field: z.number().int().positive(),
    map: z.object({ x: z.number(), y: z.number() }).optional(),
    activity: adminTaskActivitySchema,
    slug: optionalTaskSlug,
  })
  .and(adminTaskHintsSchema)

export const adminTaskPatchSchema = z
  .object({
    slug: optionalTaskSlug,
    map: z.object({ x: z.number(), y: z.number() }),
    activity: adminTaskActivitySchema,
  })
  .and(adminTaskHintsSchema)

export const scanSchema = z.object({
  taskSlug: z.string().min(1),
  token: z.string().min(1),
})

export type AdminTaskPatchInput = z.infer<typeof adminTaskPatchSchema>
export type AdminTaskCreateInput = z.infer<typeof adminTaskCreateSchema>
export type AdminTaskInput = z.infer<typeof adminTaskInputSchema>
