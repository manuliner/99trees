import { and, asc, eq, inArray, or } from 'drizzle-orm'
import { coopLinkBonusPoints } from '#shared/scoring'
import type { CoopTurnRole, PendingCoopItem, TurnState } from '#shared/types'
import { parseActivityPayload } from '#shared/quiz-payload'
import { getDb } from '../utils/db'
import { coopDepots, tasks, teams, turns } from '../database/schema'
import {
  buildMePayload,
  confirmTurn,
  getActivePlayTurn,
  getEditionOrThrow,
  parsePathFieldsJson,
} from './game'
import { parseCompletedFields } from '../utils/team-session'
import { assertEditionLive } from '../utils/edition-live'
import { parseEditionConfig } from '../utils/edition-config'

const PENDING_COOP_STATES: TurnState[] = ['awaiting_coop', 'awaiting_coop_bg']

export async function getAwaitingPartnerDepot(editionId: number, fieldNumber: number) {
  const db = getDb()
  const rows = await db
    .select()
    .from(coopDepots)
    .where(
      and(
        eq(coopDepots.editionId, editionId),
        eq(coopDepots.fieldNumber, fieldNumber),
        eq(coopDepots.state, 'awaiting_partner'),
      ),
    )
    .limit(1)
  return rows[0] ?? null
}

export function resolveCoopRole(
  teamId: number,
  fieldNumber: number,
  depot: typeof coopDepots.$inferSelect | null,
): CoopTurnRole {
  if (depot && depot.initiatorTeamId !== teamId) return 'partner'
  return 'initiator'
}

export async function assertTeamCanPlayCoopField(teamId: number, fieldNumber: number) {
  const db = getDb()
  const team = (await db.select().from(teams).where(eq(teams.id, teamId)).limit(1))[0]
  if (!team) throw createError({ statusCode: 404, statusMessage: 'Team not found' })
  const completed = parseCompletedFields(team.completedFieldsJson)
  if (completed.includes(fieldNumber)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Field already completed for this team',
    })
  }
}

export async function getPendingCoopTurns(teamId: number) {
  const db = getDb()
  return db
    .select()
    .from(turns)
    .where(
      and(
        eq(turns.teamId, teamId),
        inArray(turns.state, PENDING_COOP_STATES),
      ),
    )
    .orderBy(asc(turns.scannedAt), asc(turns.id))
}

export async function getForegroundPendingCoopTurn(teamId: number) {
  const rows = await getPendingCoopTurns(teamId)
  return rows.find((t) => t.state === 'awaiting_coop') ?? null
}

export async function getPendingCoopItems(teamId: number): Promise<PendingCoopItem[]> {
  const db = getDb()
  const team = (await db.select().from(teams).where(eq(teams.id, teamId)).limit(1))[0]
  if (!team) return []

  const depotRows = await db
    .select()
    .from(coopDepots)
    .where(
      and(
        eq(coopDepots.editionId, team.editionId),
        or(
          eq(coopDepots.initiatorTeamId, teamId),
          eq(coopDepots.partnerTeamId, teamId),
        ),
        inArray(coopDepots.state, ['awaiting_partner', 'completed']),
      ),
    )
    .orderBy(asc(coopDepots.createdAt))

  const items: PendingCoopItem[] = []
  const seenDepotIds = new Set<number>()

  for (const depot of depotRows) {
    const partnerTeamId =
      depot.initiatorTeamId === teamId ? depot.partnerTeamId : depot.initiatorTeamId
    let partnerTeamName: string | null = null
    if (partnerTeamId != null) {
      const partner = (
        await db.select({ name: teams.name }).from(teams).where(eq(teams.id, partnerTeamId)).limit(1)
      )[0]
      partnerTeamName = partner?.name ?? null
    }

    if (depot.state === 'awaiting_partner' && depot.initiatorTeamId === teamId) {
      items.push({
        depotId: depot.id,
        fieldNumber: depot.fieldNumber,
        role: 'depot_open',
        partnerTeamName: null,
        turnId: depot.initiatorTurnId,
      })
      seenDepotIds.add(depot.id)
      continue
    }

    const bonusDue =
      depot.state === 'completed'
      && (
        (depot.initiatorTeamId === teamId && !depot.initiatorBonusPaid)
        || (depot.partnerTeamId === teamId && !depot.partnerBonusPaid)
      )

    if (bonusDue) {
      const turnId =
        depot.initiatorTeamId === teamId ? depot.initiatorTurnId : depot.partnerTurnId
      items.push({
        depotId: depot.id,
        fieldNumber: depot.fieldNumber,
        role: 'bonus_pending',
        partnerTeamName,
        turnId: turnId ?? null,
      })
      seenDepotIds.add(depot.id)
    }
  }

  const pendingTurns = await getPendingCoopTurns(teamId)
  for (const turn of pendingTurns) {
    const depot = depotRows.find(
      (d) => d.partnerTurnId === turn.id || d.initiatorTurnId === turn.id,
    )
    if (!depot || seenDepotIds.has(depot.id)) continue
    if (depot.state !== 'completed') continue

    const partnerTeamId =
      depot.initiatorTeamId === teamId ? depot.partnerTeamId : depot.initiatorTeamId
    let partnerTeamName: string | null = null
    if (partnerTeamId != null) {
      const partner = (
        await db.select({ name: teams.name }).from(teams).where(eq(teams.id, partnerTeamId)).limit(1)
      )[0]
      partnerTeamName = partner?.name ?? null
    }

    const bonusDue =
      (depot.initiatorTeamId === teamId && !depot.initiatorBonusPaid)
      || (depot.partnerTeamId === teamId && !depot.partnerBonusPaid)

    if (bonusDue) {
      items.push({
        depotId: depot.id,
        fieldNumber: depot.fieldNumber,
        role: 'bonus_pending',
        partnerTeamName,
        turnId: turn.id,
      })
      seenDepotIds.add(depot.id)
    }
  }

  return items
}

export async function completeCoopInitiator(teamId: number, turnId: number) {
  const db = getDb()
  const open = await getActivePlayTurn(teamId)
  if (!open || open.id !== turnId || open.state !== 'scanned') {
    throw createError({ statusCode: 400, statusMessage: 'No co-op task active' })
  }

  const team = (await db.select().from(teams).where(eq(teams.id, teamId)).limit(1))[0]
  if (!team) throw createError({ statusCode: 404, statusMessage: 'Team not found' })

  const edition = await getEditionOrThrow(team.editionId)
  assertEditionLive(edition.status, 'complete co-op')

  const task = open.taskId
    ? (await db.select().from(tasks).where(eq(tasks.id, open.taskId)).limit(1))[0]
    : null
  if (!task || task.activityType !== 'coop') {
    throw createError({ statusCode: 400, statusMessage: 'No co-op task active' })
  }

  const existingDepot = await getAwaitingPartnerDepot(edition.id, task.fieldNumber)
  if (existingDepot) {
    throw createError({ statusCode: 409, statusMessage: 'Co-op depot already open on this field' })
  }

  await assertTeamCanPlayCoopField(teamId, task.fieldNumber)

  const now = new Date()
  await db
    .update(turns)
    .set({ state: 'completed', completedAt: now })
    .where(eq(turns.id, turnId))

  const { scoreDelta, newScore, breakdown, reachedGoal } = await confirmTurn(teamId, turnId)

  await db.insert(coopDepots).values({
    editionId: edition.id,
    fieldNumber: task.fieldNumber,
    taskId: task.id,
    initiatorTeamId: teamId,
    initiatorTurnId: turnId,
    state: 'awaiting_partner',
    createdAt: now,
  })

  return { scoreDelta, newScore, breakdown, reachedGoal }
}

export async function completeCoopPartner(teamId: number, turnId: number) {
  const db = getDb()
  const open = await getActivePlayTurn(teamId)
  if (!open || open.id !== turnId || open.state !== 'scanned') {
    throw createError({ statusCode: 400, statusMessage: 'No co-op task active' })
  }

  const team = (await db.select().from(teams).where(eq(teams.id, teamId)).limit(1))[0]
  if (!team) throw createError({ statusCode: 404, statusMessage: 'Team not found' })

  const edition = await getEditionOrThrow(team.editionId)
  assertEditionLive(edition.status, 'complete co-op')

  const task = open.taskId
    ? (await db.select().from(tasks).where(eq(tasks.id, open.taskId)).limit(1))[0]
    : null
  if (!task || task.activityType !== 'coop') {
    throw createError({ statusCode: 400, statusMessage: 'No co-op task active' })
  }

  const depot = await getAwaitingPartnerDepot(edition.id, task.fieldNumber)
  if (!depot) {
    throw createError({ statusCode: 400, statusMessage: 'No co-op depot on this field' })
  }
  if (depot.initiatorTeamId === teamId) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot join your own co-op depot' })
  }
  if (depot.partnerTeamId != null) {
    throw createError({ statusCode: 409, statusMessage: 'Co-op depot already has a partner' })
  }

  const now = new Date()
  await db
    .update(turns)
    .set({ state: 'awaiting_coop', completedAt: now })
    .where(eq(turns.id, turnId))

  await db
    .update(coopDepots)
    .set({
      partnerTeamId: teamId,
      partnerTurnId: turnId,
      state: 'completed',
      completedAt: now,
    })
    .where(eq(coopDepots.id, depot.id))

  const breakdown = await confirmCoopPartnerBaseScore(teamId, turnId)

  return { breakdown }
}

async function confirmCoopPartnerBaseScore(teamId: number, turnId: number) {
  const db = getDb()
  await db
    .update(turns)
    .set({ state: 'completed' })
    .where(eq(turns.id, turnId))

  const result = await confirmTurn(teamId, turnId)

  await db
    .update(turns)
    .set({ state: 'awaiting_coop' })
    .where(eq(turns.id, turnId))

  return result
}

export async function continuePlayingAfterCoop(teamId: number, turnId: number) {
  const db = getDb()
  const turn = (await db.select().from(turns).where(eq(turns.id, turnId)).limit(1))[0]
  if (!turn || turn.teamId !== teamId) {
    throw createError({ statusCode: 404, statusMessage: 'Turn not found' })
  }
  if (turn.state !== 'awaiting_coop') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Continue playing only during co-op wait',
    })
  }

  const team = (await db.select().from(teams).where(eq(teams.id, teamId)).limit(1))[0]
  if (!team) throw createError({ statusCode: 404, statusMessage: 'Team not found' })

  const edition = await getEditionOrThrow(team.editionId)
  assertEditionLive(edition.status, 'continue playing')

  const newPosition = turn.positionPending
  const overflowAfter = parsePathFieldsJson(team.overflowFieldsJson).filter(
    (field) => field !== newPosition,
  )

  await db
    .update(turns)
    .set({ state: 'awaiting_coop_bg' })
    .where(eq(turns.id, turnId))

  await db
    .update(teams)
    .set({
      positionConfirmed: newPosition,
      overflowFieldsJson: JSON.stringify(overflowAfter),
    })
    .where(eq(teams.id, teamId))

  return buildMePayload(teamId)
}

export async function linkCoopBonus(
  scannerTeamId: number,
  partnerSlug: string,
  token: string,
  options?: { depotId?: number; turnId?: number },
) {
  const db = getDb()
  const scanner = (await db.select().from(teams).where(eq(teams.id, scannerTeamId)).limit(1))[0]
  if (!scanner) throw createError({ statusCode: 404, statusMessage: 'Team not found' })

  const partnerRows = await db
    .select()
    .from(teams)
    .where(
      and(
        eq(teams.editionId, scanner.editionId),
        eq(teams.slug, partnerSlug),
        eq(teams.teamQrToken, token),
      ),
    )
    .limit(1)
  const partner = partnerRows[0]
  if (!partner) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid team QR code' })
  }
  if (partner.id === scannerTeamId) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot scan your own team QR' })
  }

  const edition = await getEditionOrThrow(scanner.editionId)
  assertEditionLive(edition.status, 'co-op bonus')
  const config = parseEditionConfig(edition.configJson)
  const bonus = coopLinkBonusPoints(config)

  let depotQuery = db
    .select()
    .from(coopDepots)
    .where(
      and(
        eq(coopDepots.editionId, edition.id),
        eq(coopDepots.state, 'completed'),
        or(
          and(
            eq(coopDepots.initiatorTeamId, scannerTeamId),
            eq(coopDepots.partnerTeamId, partner.id),
          ),
          and(
            eq(coopDepots.initiatorTeamId, partner.id),
            eq(coopDepots.partnerTeamId, scannerTeamId),
          ),
        ),
      ),
    )

  const depots = await depotQuery
  let depot = depots[0]
  if (options?.depotId != null) {
    depot = depots.find((d) => d.id === options.depotId) ?? depot
  }
  if (options?.turnId != null && !depot) {
    depot =
      depots.find(
        (d) => d.initiatorTurnId === options.turnId || d.partnerTurnId === options.turnId,
      ) ?? depot
  }

  if (!depot) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No co-op link with this team',
    })
  }

  if (depot.initiatorBonusPaid && depot.partnerBonusPaid) {
    throw createError({ statusCode: 400, statusMessage: 'Co-op bonus already claimed' })
  }

  const teamsToCredit: number[] = []
  if (!depot.initiatorBonusPaid) teamsToCredit.push(depot.initiatorTeamId)
  if (depot.partnerTeamId != null && !depot.partnerBonusPaid) {
    teamsToCredit.push(depot.partnerTeamId)
  }

  if (teamsToCredit.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Co-op bonus already claimed' })
  }

  for (const id of teamsToCredit) {
    const row = (await db.select().from(teams).where(eq(teams.id, id)).limit(1))[0]
    if (!row) continue
    await db
      .update(teams)
      .set({ scoreTotal: row.scoreTotal + bonus })
      .where(eq(teams.id, id))
  }

  await db
    .update(coopDepots)
    .set({
      initiatorBonusPaid: 1,
      partnerBonusPaid: depot.partnerTeamId != null ? 1 : depot.partnerBonusPaid,
    })
    .where(eq(coopDepots.id, depot.id))

  const updatedScanner = (
    await db.select().from(teams).where(eq(teams.id, scannerTeamId)).limit(1)
  )[0]!

  return {
    bonusPoints: bonus,
    creditedTeamIds: [...teamsToCredit],
    newScore: updatedScanner.scoreTotal,
    depotId: depot.id,
  }
}

export function coopPayloadRole(
  teamId: number,
  fieldNumber: number,
  depot: typeof coopDepots.$inferSelect | null,
): CoopTurnRole {
  return resolveCoopRole(teamId, fieldNumber, depot)
}

export async function coopRoleForOpenTurn(
  teamId: number,
  editionId: number,
  fieldNumber: number,
): Promise<CoopTurnRole> {
  const depot = await getAwaitingPartnerDepot(editionId, fieldNumber)
  return resolveCoopRole(teamId, fieldNumber, depot)
}

export function parseCoopPayloadFromTask(task: { activityPayloadJson: string }) {
  return parseActivityPayload(JSON.parse(task.activityPayloadJson))
}
