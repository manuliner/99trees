import type { ZodSchema } from 'zod'

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body)
  if (result.success) return result.data

  const first = result.error.errors[0]
  throw createError({
    statusCode: 400,
    statusMessage: first?.message ?? 'Invalid request body',
  })
}
