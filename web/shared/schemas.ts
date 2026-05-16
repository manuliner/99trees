import { z } from 'zod'

export const createTeamSchema = z.object({
  editionId: z.number().int().positive(),
  name: z.string().trim().min(3).max(32),
  pin: z.string().regex(/^\d{4}$/),
  size: z.number().int().min(1).max(5).optional(),
})

export const rejoinTeamSchema = z.object({
  editionId: z.number().int().positive(),
  name: z.string().trim().min(3).max(32),
  pin: z.string().regex(/^\d{4}$/),
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
