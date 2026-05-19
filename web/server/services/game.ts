import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { parseEditionSlug } from '#shared/edition-urls'
import { parseHintColumn } from '../utils/admin-task'
import { getDb } from '../utils/db'
import { editions, tasks, teams, turns } from '../database/schema'
import { parseEditionConfig } from '../utils/edition-config'
import {
  parseCompletedFields,
  serializeCompletedFields,
} from '../utils/team-session'
import { overflowJsonAfterAbandon } from '#shared/board-overflow'
import { resolvePendingPosition, splitMovePathByCompleted } from '#shared/game-board-layout'
import { calculateTurnScoreBreakdown, type TurnScoreInput } from '#shared/scoring'
import { teamQrPath } from '#shared/edition-urls'
import { activityPayloadForTeam, parseActivityPayload } from '#shared/quiz-payload'
import type { CoopTurnRole, EditionConfig, MediaUploadPolicy, TurnState } from '#shared/types'
import { resolveClientTranscodePolicy } from '#shared/types'
import {
  coopRoleForOpenTurn,
  getForegroundPendingCoopTurn,
  getPendingCoopItems,
  getPendingCoopTurns,
} from './coop'
import { assertEditionLive } from '../utils/edition-live'
import { isDevSimulationEnabled } from '../utils/dev-only'
import { parseLocalizedString } from '#shared/localized'
import { resolveEditionColorPalette } from '#shared/pixel-palettes'
import { getSubmissionByTurnId } from './media-submission'

export async function getEditionOrThrow(editionId: number) {
  const db = getDb()
  const rows = await db.select().from(editions).where(eq(editions.id, editionId)).limit(1)
  const edition = rows[0]
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })
  return edition
}

export async function getEditionBySlugOrThrow(rawSlug: string) {
  const slug = parseEditionSlug(rawSlug)
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Invalid edition slug' })
  const db = getDb()
  const rows = await db.select().from(editions).where(eq(editions.slug, slug)).limit(1)
  const edition = rows[0]
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })
  return edition
}

export function publicEditionPayload(edition: typeof editions.$inferSelect) {
  const joinDescription = parseLocalizedString(edition.joinDescriptionJson)
  const hasJoinDescription = joinDescription.de.trim().length > 0 || joinDescription.en.trim().length > 0
  const config = parseEditionConfig(edition.configJson)
  return {
    id: edition.id,
    slug: edition.slug,
    name: edition.name,
    status: edition.status,
    fieldCount: edition.fieldCount,
    startsAt: edition.startsAt,
    endsAt: edition.endsAt,
    joinDescription: hasJoinDescription ? joinDescription : null,
    joinLogoUrl: edition.joinLogoPath ?? null,
    colorPalette: config.colorPalette!,
  }
}

const ACTIVE_PLAY_STATES: TurnState[] = ['rolled', 'scanned', 'completed']

function findLatestUnconfirmedTurn(
  rows: (typeof turns.$inferSelect)[],
  states: TurnState[],
) {
  return (
    rows.find(
      (t) =>
        states.includes(t.state as TurnState)
        && t.confirmedAt == null
        && t.state !== 'abandoned',
    ) ?? null
  )
}

/** Turn blocking roll / hint / scan / quiz (not performance crew wait). */
export async function getActivePlayTurn(teamId: number) {
  const db = getDb()
  const rows = await db
    .select()
    .from(turns)
    .where(eq(turns.teamId, teamId))
    .orderBy(desc(turns.id))
    .limit(5)
  return findLatestUnconfirmedTurn(rows, ACTIVE_PLAY_STATES)
}

const PENDING_CREW_STATES: TurnState[] = ['awaiting_crew', 'awaiting_crew_bg']

/** All performance turns awaiting crew (oldest first). */
export async function getPendingCrewTurns(teamId: number) {
  const db = getDb()
  return db
    .select()
    .from(turns)
    .where(
      and(
        eq(turns.teamId, teamId),
        inArray(turns.state, PENDING_CREW_STATES),
        isNull(turns.confirmedAt),
      ),
    )
    .orderBy(asc(turns.scannedAt), asc(turns.id))
}

/** Newest performance turn still on the waiting screen (not deferred). */
export async function getForegroundPendingCrewTurn(teamId: number) {
  const rows = await getPendingCrewTurns(teamId)
  return rows.find((t) => t.state === 'awaiting_crew') ?? null
}

/** @deprecated Prefer getPendingCrewTurns — returns newest pending crew turn. */
export async function getPendingCrewTurn(teamId: number) {
  const rows = await getPendingCrewTurns(teamId)
  return rows.length > 0 ? rows[rows.length - 1]! : null
}

/** @deprecated Use getActivePlayTurn or getPendingCrewTurn */
export async function getOpenTurn(teamId: number) {
  return getActivePlayTurn(teamId)
}

export function rollDice(config: EditionConfig): number {
  const min = config.diceMin
  const max = config.diceMax
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** Zielfelder aus Nullrunden an derselben Standposition — kein erneutes Ansteuern. */
export async function getExcludedPendingFromAbandons(
  teamId: number,
  positionFrom: number,
): Promise<Set<number>> {
  const db = getDb()
  const rows = await db
    .select({ positionPending: turns.positionPending })
    .from(turns)
    .where(
      and(
        eq(turns.teamId, teamId),
        eq(turns.state, 'abandoned'),
        eq(turns.positionFrom, positionFrom),
      ),
    )
  return new Set(rows.map((r) => r.positionPending))
}

/** Würfelwert, dessen Zielfeld nicht in `excludedPending` liegt (Fallback: voller Bereich). */
export function pickDiceForRoll(
  config: EditionConfig,
  from: number,
  completed: number[],
  fieldCount: number,
  excludedPending: ReadonlySet<number>,
): number {
  const min = config.diceMin
  const max = config.diceMax
  const candidates: number[] = []
  for (let d = min; d <= max; d++) {
    const pending = resolvePendingPosition(from, d, completed, fieldCount)
    if (!excludedPending.has(pending)) candidates.push(d)
  }
  const pool = candidates.length > 0 ? candidates : Array.from({ length: max - min + 1 }, (_, i) => min + i)
  return pool[Math.floor(Math.random() * pool.length)]!
}

export { resolvePendingPosition } from '#shared/game-board-layout'

/** Dev/display: first dice in range that lands on target, else clamped distance. */
export function pickDiceForTargetField(
  config: EditionConfig,
  from: number,
  targetField: number,
  completed: readonly number[],
  fieldCount: number,
): number {
  const min = config.diceMin
  const max = config.diceMax
  for (let d = min; d <= max; d++) {
    const pending = resolvePendingPosition(from, d, completed, fieldCount)
    if (pending === targetField) return d
  }
  return Math.min(max, Math.max(min, targetField - from))
}

export async function assertCanStartNewRoll(teamId: number) {
  const open = await getActivePlayTurn(teamId)
  if (open) {
    throw createError({ statusCode: 409, statusMessage: 'Finish or abandon current turn first' })
  }

  const foregroundCrew = await getForegroundPendingCrewTurn(teamId)
  if (foregroundCrew) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Continue playing only during crew wait',
    })
  }

  const foregroundCoop = await getForegroundPendingCoopTurn(teamId)
  if (foregroundCoop) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Continue playing only during co-op wait',
    })
  }
}

export type RolledTurnResult = {
  turnId: number
  dice: number
  positionFrom: number
  positionPending: number
  playedFields: number[]
  overflowFields: number[]
  boardHighlights: ReturnType<typeof buildBoardHighlights>
  task: { fieldNumber: number; hintVague: ReturnType<typeof parseHintColumn> } | null
}

export async function createRolledTurn(
  team: typeof teams.$inferSelect,
  edition: typeof editions.$inferSelect,
  pending: number,
  dice: number,
  completed: readonly number[],
): Promise<RolledTurnResult> {
  const from = team.positionConfirmed
  const { playedFields, overflowFields } = splitMovePathByCompleted(from, pending, completed)
  const now = new Date()
  const db = getDb()

  const inserted = await db
    .insert(turns)
    .values({
      teamId: team.id,
      state: 'rolled',
      diceValue: dice,
      positionFrom: from,
      positionPending: pending,
      pathPlayedFieldsJson: JSON.stringify(playedFields),
      pathOverflowFieldsJson: JSON.stringify(overflowFields),
      teamOverflowBeforeRollJson: team.overflowFieldsJson,
      rolledAt: now,
      createdAt: now,
    })
    .returning()

  const task = await getTaskForField(edition.id, pending)
  const boardHighlights = await appendTeamOverflowFields(team.id, overflowFields, completed)

  return {
    turnId: inserted[0]!.id,
    dice,
    positionFrom: from,
    positionPending: pending,
    playedFields,
    overflowFields,
    boardHighlights,
    task: task
      ? { fieldNumber: task.fieldNumber, hintVague: parseHintColumn(task.hintVague) }
      : null,
  }
}

export async function getDevFieldActivities(editionId: number) {
  if (!isDevSimulationEnabled()) return []
  const db = getDb()
  const rows = await db
    .select({
      fieldNumber: tasks.fieldNumber,
      activityType: tasks.activityType,
    })
    .from(tasks)
    .where(eq(tasks.editionId, editionId))
  return rows.map((r) => ({
    fieldNumber: r.fieldNumber,
    activityType: r.activityType as 'quiz' | 'performance' | 'media' | 'coop',
  }))
}

export async function getTaskForField(editionId: number, fieldNumber: number) {
  const db = getDb()
  const rows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.editionId, editionId), eq(tasks.fieldNumber, fieldNumber)))
    .limit(1)
  return rows[0] ?? null
}

/** @deprecated Use getTaskForField */
export const getStationForField = getTaskForField

export async function deductHintCost(teamId: number, turnId: number, newTotalHintCost: number) {
  const db = getDb()
  const turn = (await db.select().from(turns).where(eq(turns.id, turnId)).limit(1))[0]
  if (!turn || turn.teamId !== teamId) return 0

  const already = turn.hintPointsDeducted ?? 0
  const delta = Math.max(0, newTotalHintCost - already)
  if (delta === 0) return 0

  const team = (await db.select().from(teams).where(eq(teams.id, teamId)).limit(1))[0]
  if (!team) return 0

  await db
    .update(teams)
    .set({ scoreTotal: Math.max(0, team.scoreTotal - delta) })
    .where(eq(teams.id, teamId))
  await db
    .update(turns)
    .set({ hintPointsDeducted: already + delta })
    .where(eq(turns.id, turnId))

  return delta
}

export function parseHintsUsed(json: string): number[] {
  try {
    return JSON.parse(json) as number[]
  }
  catch {
    return []
  }
}

export function parsePathFieldsJson(json: string): number[] {
  try {
    const parsed = JSON.parse(json) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map(Number).filter((n) => Number.isFinite(n))
  }
  catch {
    return []
  }
}

export function buildBoardHighlights(
  completedFields: readonly number[],
  overflowFieldsJson: string,
) {
  const completedSet = new Set(completedFields)
  const overflowFields = parsePathFieldsJson(overflowFieldsJson).filter(
    (field) => !completedSet.has(field),
  )
  return {
    playedFields: [...completedFields],
    overflowFields,
  }
}

export async function revertTeamOverflowAfterAbandon(
  teamId: number,
  turn: {
    pathOverflowFieldsJson: string
    teamOverflowBeforeRollJson: string | null | undefined
  },
) {
  const db = getDb()
  const team = (await db.select().from(teams).where(eq(teams.id, teamId)).limit(1))[0]
  if (!team) throw createError({ statusCode: 404, statusMessage: 'Team not found' })

  const overflowJson = overflowJsonAfterAbandon(
    team.overflowFieldsJson,
    turn.pathOverflowFieldsJson,
    turn.teamOverflowBeforeRollJson,
  )

  await db
    .update(teams)
    .set({ overflowFieldsJson: overflowJson })
    .where(eq(teams.id, teamId))
}

export async function appendTeamOverflowFields(
  teamId: number,
  newOverflow: readonly number[],
  completedAtRoll: readonly number[],
) {
  const db = getDb()
  const team = (await db.select().from(teams).where(eq(teams.id, teamId)).limit(1))[0]
  if (!team) throw createError({ statusCode: 404, statusMessage: 'Team not found' })

  const completedSet = new Set([
    ...completedAtRoll,
    ...parseCompletedFields(team.completedFieldsJson),
  ])
  const merged = [
    ...new Set([
      ...parsePathFieldsJson(team.overflowFieldsJson),
      ...newOverflow.filter((field) => !completedSet.has(field)),
    ]),
  ].filter((field) => !completedSet.has(field))

  await db
    .update(teams)
    .set({ overflowFieldsJson: JSON.stringify(merged) })
    .where(eq(teams.id, teamId))

  return buildBoardHighlights(parseCompletedFields(team.completedFieldsJson), JSON.stringify(merged))
}

export async function buildMePayload(teamId: number) {
  const db = getDb()
  const team = (await db.select().from(teams).where(eq(teams.id, teamId)).limit(1))[0]
  if (!team) throw createError({ statusCode: 404, statusMessage: 'Team not found' })

  const edition = await getEditionOrThrow(team.editionId)
  const config = parseEditionConfig(edition.configJson)
  const mediaUploadPolicy: MediaUploadPolicy = {
    clientTranscode: resolveClientTranscodePolicy(config.clientTranscode),
  }
  const completedFields = parseCompletedFields(team.completedFieldsJson)
  const activePlayTurn = await getActivePlayTurn(team.id)
  const pendingCrewRows = await getPendingCrewTurns(team.id)
  const pendingCoopRows = await getPendingCoopTurns(team.id)
  const foregroundCrew = pendingCrewRows.find((t) => t.state === 'awaiting_crew') ?? null
  const foregroundCoop = pendingCoopRows.find((t) => t.state === 'awaiting_coop') ?? null
  const openTurn = activePlayTurn ?? foregroundCrew ?? foregroundCoop

  let turnPayload = null
  if (openTurn) {
    const hintsUsed = parseHintsUsed(openTurn.hintsUsedJson)
    const task =
      openTurn.taskId != null
        ? (await db.select().from(tasks).where(eq(tasks.id, openTurn.taskId)).limit(1))[0]
        : await getTaskForField(edition.id, openTurn.positionPending)

    const now = Date.now()
    const rolledAt = openTurn.rolledAt?.getTime() ?? now
    const hintUnlockAt = config.hintTimerMinutes.map((m) => rolledAt + m * 60_000)

    const playedFields = parsePathFieldsJson(openTurn.pathPlayedFieldsJson)
    const overflowFields = parsePathFieldsJson(openTurn.pathOverflowFieldsJson)
    const pathHighlights =
      playedFields.length > 0 || overflowFields.length > 0
        ? { playedFields, overflowFields }
        : splitMovePathByCompleted(
            openTurn.positionFrom,
            openTurn.positionPending,
            completedFields,
          )

    let coopRole: CoopTurnRole | null = null
    if (task?.activityType === 'coop' && openTurn.state === 'scanned') {
      coopRole = await coopRoleForOpenTurn(team.id, edition.id, openTurn.positionPending)
    }

    let mediaSubmission: { id: number; kind: string } | null = null
    if (task?.activityType === 'media') {
      const submission = await getSubmissionByTurnId(openTurn.id)
      if (submission) {
        mediaSubmission = { id: submission.id, kind: submission.kind }
      }
    }

    turnPayload = {
      id: openTurn.id,
      state: openTurn.state,
      diceValue: openTurn.diceValue,
      positionFrom: openTurn.positionFrom,
      positionPending: openTurn.positionPending,
      playedFields: pathHighlights.playedFields,
      overflowFields: pathHighlights.overflowFields,
      hintMode: openTurn.hintMode,
      hintsUsed,
      hintUnlockAt,
      canRevealAll: openTurn.state === 'rolled',
      canRollAgain: false,
      coopRole,
      mediaSubmission,
      task: task
        ? {
            fieldNumber: task.fieldNumber,
            hintVague: parseHintColumn(task.hintVague),
            hintLevel1: parseHintColumn(task.hintLevel1),
            hintLevel2: parseHintColumn(task.hintLevel2),
            mapX: task.mapX,
            mapY: task.mapY,
            activityType: task.activityType,
            activityPayload: activityPayloadForTeam(
              parseActivityPayload(JSON.parse(task.activityPayloadJson)),
            ),
          }
        : null,
    }

    if (openTurn.state === 'rolled') {
      const allHintsAvailable =
        openTurn.hintMode === 'reveal_all' || now >= hintUnlockAt[2]!
      turnPayload.canRollAgain = allHintsAvailable
    }
  }

  const mapPins: { fieldNumber: number; mapX: number; mapY: number; kind: 'visited' | 'target' }[] = []

  if (completedFields.length > 0) {
    const visitedTasks = await db
      .select({
        fieldNumber: tasks.fieldNumber,
        mapX: tasks.mapX,
        mapY: tasks.mapY,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.editionId, edition.id),
          inArray(tasks.fieldNumber, completedFields),
        ),
      )
    for (const t of visitedTasks) {
      mapPins.push({
        fieldNumber: t.fieldNumber,
        mapX: t.mapX,
        mapY: t.mapY,
        kind: 'visited',
      })
    }
  }

  if (openTurn?.state === 'rolled' && turnPayload?.task) {
    const hintsUsed = parseHintsUsed(openTurn.hintsUsedJson)
    const hint3Visible =
      hintsUsed.includes(3) || openTurn.hintMode === 'reveal_all'
    if (hint3Visible) {
      const tk = turnPayload.task
      if (!mapPins.some((p) => p.fieldNumber === tk.fieldNumber && p.kind === 'target')) {
        mapPins.push({
          fieldNumber: tk.fieldNumber,
          mapX: tk.mapX,
          mapY: tk.mapY,
          kind: 'target',
        })
      }
    }
  }

  const boardHighlights = buildBoardHighlights(
    completedFields,
    team.overflowFieldsJson,
  )

  const pendingCrewTurns: {
    turnId: number
    fieldNumber: number
    scannedAt: string | null
  }[] = []

  for (const row of pendingCrewRows) {
    const crewTask =
      row.taskId != null
        ? (await db.select().from(tasks).where(eq(tasks.id, row.taskId)).limit(1))[0]
        : null
    pendingCrewTurns.push({
      turnId: row.id,
      fieldNumber: crewTask?.fieldNumber ?? row.positionPending,
      scannedAt: row.scannedAt?.toISOString() ?? null,
    })
  }

  const pendingCrewTurn = pendingCrewTurns.length > 0 ? pendingCrewTurns[pendingCrewTurns.length - 1]! : null

  const pendingCoopItems = await getPendingCoopItems(team.id)
  const devFieldActivities = await getDevFieldActivities(edition.id)

  return {
    devSimulation: isDevSimulationEnabled(),
    devFieldActivities,
    boardHighlights,
    team: {
      id: team.id,
      name: team.name,
      slug: team.slug,
      editionId: team.editionId,
      positionConfirmed: team.positionConfirmed,
      scoreTotal: team.scoreTotal,
      reachedGoal: team.reachedGoalAt != null,
      completedFields,
      teamQrPath: teamQrPath(team.editionId, team.slug, team.teamQrToken),
      avatarId: team.avatarId,
      motto: team.motto,
      onboardingComplete: team.onboardingCompletedAt != null,
    },
    edition: {
      id: edition.id,
      slug: edition.slug,
      name: edition.name,
      status: edition.status,
      fieldCount: edition.fieldCount,
      config,
      mapImageUrl: edition.mapImagePath ?? null,
    },
    mediaUploadPolicy,
    mapPins,
    openTurn: turnPayload,
    pendingCrewTurn,
    pendingCrewTurns,
    pendingCoopItems,
  }
}

export { getForegroundPendingCoopTurn, continuePlayingAfterCoop } from './coop'

function buildTurnScoreInput(
  turn: {
    state?: string
    hintMode: string | null
    hintsUsedJson: string
    quizWrongAttempts: number
    bonusPoints: number
    scannedAt: Date | null
    hintPointsDeducted: number
  },
  config: EditionConfig,
  confirmedAtMs: number,
): TurnScoreInput {
  return {
    config,
    hintMode: (turn.hintMode as 'wait' | 'reveal_all') ?? null,
    hintsUsedLevels: parseHintsUsed(turn.hintsUsedJson),
    quizWrongAttempts: turn.quizWrongAttempts,
    bonusPoints: turn.bonusPoints,
    scannedAtMs: turn.scannedAt?.getTime() ?? null,
    confirmedAtMs: confirmedAtMs,
    hintsAlreadyDeducted: turn.hintPointsDeducted ?? 0,
    abandoned: turn.state === 'abandoned',
  }
}

export async function getTurnScoreSummary(teamId: number, turnId: number) {
  const db = getDb()
  const team = (await db.select().from(teams).where(eq(teams.id, teamId)).limit(1))[0]
  if (!team) throw createError({ statusCode: 404, statusMessage: 'Team not found' })

  const turn = (await db.select().from(turns).where(eq(turns.id, turnId)).limit(1))[0]
  if (!turn || turn.teamId !== teamId) throw createError({ statusCode: 404, statusMessage: 'Turn not found' })
  if (!turn.confirmedAt) {
    throw createError({ statusCode: 400, statusMessage: 'Turn not confirmed yet' })
  }

  const edition = await getEditionOrThrow(team.editionId)
  const config = parseEditionConfig(edition.configJson)
  const breakdown = calculateTurnScoreBreakdown(
    buildTurnScoreInput(turn, config, turn.confirmedAt.getTime()),
  )

  return {
    breakdown,
    newScore: team.scoreTotal,
    scoreDelta: turn.scoreDelta ?? breakdown.total,
  }
}

export async function confirmTurn(teamId: number, turnId: number) {
  const db = getDb()
  const team = (await db.select().from(teams).where(eq(teams.id, teamId)).limit(1))[0]
  if (!team) throw createError({ statusCode: 404, statusMessage: 'Team not found' })

  const turn = (await db.select().from(turns).where(eq(turns.id, turnId)).limit(1))[0]
  if (!turn || turn.teamId !== teamId) throw createError({ statusCode: 404, statusMessage: 'Turn not found' })
  if (turn.state !== 'completed') {
    throw createError({ statusCode: 400, statusMessage: 'Task not completed yet' })
  }

  const edition = await getEditionOrThrow(team.editionId)
  assertEditionLive(edition.status, 'confirm turn')
  const config = parseEditionConfig(edition.configJson)
  const confirmedAt = new Date()

  const breakdown = calculateTurnScoreBreakdown(
    buildTurnScoreInput(turn, config, confirmedAt.getTime()),
  )
  const scoreDelta = breakdown.total

  const fieldNumber = turn.positionPending
  const completed = parseCompletedFields(team.completedFieldsJson)
  if (!completed.includes(fieldNumber)) completed.push(fieldNumber)

  const overflowAfterConfirm = parsePathFieldsJson(team.overflowFieldsJson).filter(
    (field) => field !== fieldNumber,
  )

  const newScore = team.scoreTotal + scoreDelta
  const newPosition =
    team.positionConfirmed < fieldNumber ? fieldNumber : team.positionConfirmed
  const reachedGoal = newPosition >= edition.fieldCount
  const reachedGoalAt = reachedGoal && !team.reachedGoalAt ? confirmedAt : team.reachedGoalAt

  await db
    .update(turns)
    .set({ scoreDelta, confirmedAt })
    .where(eq(turns.id, turnId))

  await db
    .update(teams)
    .set({
      positionConfirmed: newPosition,
      scoreTotal: newScore,
      completedFieldsJson: serializeCompletedFields(completed),
      overflowFieldsJson: JSON.stringify(overflowAfterConfirm),
      reachedGoalAt,
    })
    .where(eq(teams.id, teamId))

  return { scoreDelta, breakdown, newPosition, newScore, reachedGoal }
}

export async function continuePlayingAfterPerformance(teamId: number, turnId: number) {
  const db = getDb()
  const turn = (await db.select().from(turns).where(eq(turns.id, turnId)).limit(1))[0]
  if (!turn || turn.teamId !== teamId) {
    throw createError({ statusCode: 404, statusMessage: 'Turn not found' })
  }
  if (turn.state !== 'awaiting_crew') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Continue playing only during crew wait',
    })
  }

  const task = turn.taskId
    ? (await db.select().from(tasks).where(eq(tasks.id, turn.taskId)).limit(1))[0]
    : null
  if (task?.activityType !== 'performance' && task?.activityType !== 'media') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Continue playing only during crew wait',
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
    .set({ state: 'awaiting_crew_bg' })
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
