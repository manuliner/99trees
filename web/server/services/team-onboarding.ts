import { eq } from 'drizzle-orm'
import type { teamOnboardingPatchSchema } from '#shared/schemas'
import type { z } from 'zod'
import { getDb } from '../utils/db'
import { teams } from '../database/schema'
import { isTeamAvatarId } from '#shared/team-avatars'
import { buildMePayload } from './game'

type OnboardingPatch = z.infer<typeof teamOnboardingPatchSchema>

export async function patchTeamOnboarding(teamId: number, body: OnboardingPatch) {
  const db = getDb()
  const team = (await db.select().from(teams).where(eq(teams.id, teamId)).limit(1))[0]
  if (!team) {
    throw createError({ statusCode: 404, statusMessage: 'Team not found' })
  }

  if (team.onboardingCompletedAt != null) {
    return buildMePayload(teamId)
  }

  const now = new Date()

  if ('avatarId' in body) {
    if (!isTeamAvatarId(body.avatarId)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid avatar' })
    }
    await db
      .update(teams)
      .set({ avatarId: body.avatarId })
      .where(eq(teams.id, teamId))
    return buildMePayload(teamId)
  }

  if (!team.avatarId) {
    throw createError({ statusCode: 400, statusMessage: 'Choose an avatar first' })
  }

  await db
    .update(teams)
    .set({
      motto: body.motto,
      onboardingCompletedAt: now,
    })
    .where(eq(teams.id, teamId))

  return buildMePayload(teamId)
}
