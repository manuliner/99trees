import { and, eq, inArray, like } from 'drizzle-orm'
import { resolveLocalized } from '#shared/localized'
import { parseActivityPayload } from '#shared/quiz-payload'
import type { MediaKind, PendingApproval } from '#shared/types'
import { MEDIA_APPROVAL_ACTIONS, PERFORMANCE_APPROVAL_ACTIONS } from '#shared/types'
import { getDb } from '../utils/db'
import { crewRatings, tasks, teams, turns } from '../database/schema'
import { confirmTurn, getActivePlayTurn, getEditionOrThrow, getPendingCrewTurns } from './game'
import { getSubmissionByTurnId } from './media-submission'

function activitySummary(activityPayloadJson: string | null, activityType: string | null): string {
  if (!activityPayloadJson) return ''
  try {
    const payload = parseActivityPayload(JSON.parse(activityPayloadJson))
    if (payload.type === 'performance' || payload.type === 'media') {
      return resolveLocalized(payload.text, 'en')
    }
  }
  catch {
    /* ignore */
  }
  if (activityType === 'media') return 'Media submission'
  return ''
}

function buildPerformanceApproval(row: {
  turnId: number
  teamId: number
  teamName: string
  fieldNumber: number | null
  slug: string | null
  scannedAt: Date | null
  activityPayloadJson: string | null
  activityType: string | null
}): PendingApproval {
  return {
    turnId: row.turnId,
    teamId: row.teamId,
    teamName: row.teamName,
    fieldNumber: row.fieldNumber,
    taskSlug: row.slug,
    waitingSince: row.scannedAt?.toISOString() ?? null,
    kind: 'performance',
    summary: activitySummary(row.activityPayloadJson, row.activityType),
    actions: PERFORMANCE_APPROVAL_ACTIONS,
  }
}

async function buildMediaApproval(row: {
  turnId: number
  teamId: number
  teamName: string
  fieldNumber: number | null
  slug: string | null
  scannedAt: Date | null
  activityPayloadJson: string | null
  activityType: string | null
  editionId: number
}): Promise<PendingApproval> {
  const submission = await getSubmissionByTurnId(row.turnId)
  return {
    turnId: row.turnId,
    teamId: row.teamId,
    teamName: row.teamName,
    fieldNumber: row.fieldNumber,
    taskSlug: row.slug,
    waitingSince: row.scannedAt?.toISOString() ?? null,
    kind: 'media',
    summary: activitySummary(row.activityPayloadJson, row.activityType),
    actions: MEDIA_APPROVAL_ACTIONS,
    previewUrl: submission ? `/api/crew/submissions/${submission.id}/content` : null,
    mediaKind: (submission?.kind as MediaKind | undefined) ?? null,
  }
}

async function buildCrewApproval(row: {
  turnId: number
  teamId: number
  teamName: string
  fieldNumber: number | null
  slug: string | null
  scannedAt: Date | null
  activityPayloadJson: string | null
  activityType: string | null
  editionId: number
}): Promise<PendingApproval> {
  if (row.activityType === 'media') return buildMediaApproval(row)
  return buildPerformanceApproval(row)
}

export async function searchTeams(editionId: number, q: string) {
  const db = getDb()
  const pattern = `%${q.trim()}%`
  return db
    .select({ id: teams.id, name: teams.name, positionConfirmed: teams.positionConfirmed })
    .from(teams)
    .where(and(eq(teams.editionId, editionId), like(teams.name, pattern)))
    .limit(20)
}

export async function resolveTeamQr(editionId: number, slug: string, token: string) {
  const db = getDb()
  const rows = await db
    .select()
    .from(teams)
    .where(and(eq(teams.editionId, editionId), eq(teams.slug, slug), eq(teams.teamQrToken, token)))
    .limit(1)
  return rows[0] ?? null
}

export async function getCrewTeamDetail(editionId: number, teamId: number) {
  const db = getDb()
  const team = (
    await db
      .select()
      .from(teams)
      .where(and(eq(teams.id, teamId), eq(teams.editionId, editionId)))
      .limit(1)
  )[0]
  if (!team) throw createError({ statusCode: 404, statusMessage: 'Team not found' })

  const activePlayTurn = await getActivePlayTurn(teamId)
  const pendingCrewRows = await getPendingCrewTurns(teamId)
  const displayTurn = activePlayTurn ?? pendingCrewRows[pendingCrewRows.length - 1] ?? null

  let currentTurn = null
  const pendingApprovals: PendingApproval[] = []
  if (
    displayTurn
    && ['awaiting_crew', 'awaiting_crew_bg', 'scanned', 'rolled', 'completed'].includes(displayTurn.state)
  ) {
    const task = displayTurn.taskId
      ? (await db.select().from(tasks).where(eq(tasks.id, displayTurn.taskId)).limit(1))[0]
      : null
    currentTurn = {
      id: displayTurn.id,
      state: displayTurn.state,
      positionPending: displayTurn.positionPending,
      activityType: task?.activityType,
      activityPayload: task ? parseActivityPayload(JSON.parse(task.activityPayloadJson)) : null,
      taskSlug: task?.slug,
      fieldNumber: task?.fieldNumber,
    }
  }

  for (const pendingCrewTurn of pendingCrewRows) {
    const task = pendingCrewTurn.taskId
      ? (await db.select().from(tasks).where(eq(tasks.id, pendingCrewTurn.taskId)).limit(1))[0]
      : null
    pendingApprovals.push(
      await buildCrewApproval({
        turnId: pendingCrewTurn.id,
        teamId: team.id,
        teamName: team.name,
        fieldNumber: task?.fieldNumber ?? null,
        slug: task?.slug ?? null,
        scannedAt: pendingCrewTurn.scannedAt,
        activityPayloadJson: task?.activityPayloadJson ?? null,
        activityType: task?.activityType ?? null,
        editionId: team.editionId,
      }),
    )
  }

  return {
    team: { id: team.id, name: team.name, positionConfirmed: team.positionConfirmed },
    currentTurn,
    pendingApproval: pendingApprovals[0] ?? null,
    pendingApprovals,
  }
}

export async function ratePerformanceTurn(
  editionId: number,
  teamId: number,
  turnId: number,
  rating: 'ok' | 'bonus',
) {
  const db = getDb()
  await getEditionOrThrow(editionId)

  const turn = (await db.select().from(turns).where(eq(turns.id, turnId)).limit(1))[0]
  if (!turn || turn.teamId !== teamId) {
    throw createError({ statusCode: 404, statusMessage: 'Turn not found' })
  }
  if (turn.state !== 'awaiting_crew' && turn.state !== 'awaiting_crew_bg') {
    throw createError({ statusCode: 400, statusMessage: 'Team is not awaiting crew rating' })
  }

  const existing = await db.select().from(crewRatings).where(eq(crewRatings.turnId, turnId)).limit(1)
  if (existing[0]) {
    throw createError({ statusCode: 409, statusMessage: 'Already rated' })
  }

  const bonusPoints = rating === 'bonus' ? 25 : 0
  const now = new Date()

  await db.insert(crewRatings).values({ turnId, rating, createdAt: now })
  await db
    .update(turns)
    .set({ state: 'completed', completedAt: now, bonusPoints })
    .where(eq(turns.id, turnId))

  const { scoreDelta, breakdown, newScore } = await confirmTurn(teamId, turnId)
  return { ok: true, bonusPoints, scoreDelta, breakdown, newScore }
}

export async function getPendingPerformances(editionId: number): Promise<PendingApproval[]> {
  const db = getDb()
  const rows = await db
    .select({
      turnId: turns.id,
      teamId: teams.id,
      teamName: teams.name,
      fieldNumber: tasks.fieldNumber,
      slug: tasks.slug,
      scannedAt: turns.scannedAt,
      activityPayloadJson: tasks.activityPayloadJson,
      activityType: tasks.activityType,
      editionId: teams.editionId,
    })
    .from(turns)
    .innerJoin(teams, eq(turns.teamId, teams.id))
    .leftJoin(tasks, eq(turns.taskId, tasks.id))
    .where(
      and(
        eq(teams.editionId, editionId),
        inArray(turns.state, ['awaiting_crew', 'awaiting_crew_bg']),
        inArray(tasks.activityType, ['performance', 'media']),
      ),
    )
    .orderBy(turns.scannedAt)

  const approvals: PendingApproval[] = []
  for (const r of rows) {
    approvals.push(await buildCrewApproval(r))
  }
  return approvals
}

export async function resetTeamPin(editionId: number, teamId: number) {
  const bcrypt = await import('bcryptjs')
  const db = getDb()
  const team = (
    await db
      .select()
      .from(teams)
      .where(and(eq(teams.id, teamId), eq(teams.editionId, editionId)))
      .limit(1)
  )[0]
  if (!team) throw createError({ statusCode: 404, statusMessage: 'Team not found' })

  const tempPin = String(Math.floor(1000 + Math.random() * 9000))
  const pinHash = await bcrypt.hash(tempPin, 10)
  await db.update(teams).set({ pinHash }).where(eq(teams.id, teamId))
  return { tempPin, teamName: team.name }
}
