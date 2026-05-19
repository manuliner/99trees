import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { eq } from 'drizzle-orm'
import { fileTypeFromBuffer } from 'file-type'
import {
  maxDurationForKind,
  MEDIA_KIND_LIMITS,
  MEDIA_UPLOAD_MAX_BYTES,
  mediaKindAllowed,
  normalizeMimeType,
  resolveMediaKind,
  resolveMimeType,
} from '#shared/media-limits'
import type { MediaKind } from '#shared/types'
import { parseActivityPayload } from '#shared/quiz-payload'
import { getDb } from '../utils/db'
import { tasks, turnSubmissions, turns } from '../database/schema'
import { assertEditionLive } from '../utils/edition-live'
import { getEditionOrThrow } from './game'
import { logGameEvent } from '../utils/logger'

function dataRootFromConfig(): string {
  const config = useRuntimeConfig()
  return dirname(resolve(config.sqliteDatabasePath as string))
}

function submissionDir(editionId: number): string {
  return join(dataRootFromConfig(), 'uploads', 'submissions', String(editionId))
}

function submissionFilePath(editionId: number, storedFilename: string): string {
  return join(submissionDir(editionId), storedFilename)
}

export function crewSubmissionContentPath(editionId: number, storedFilename: string): string {
  return submissionFilePath(editionId, storedFilename)
}

export async function getSubmissionById(submissionId: number) {
  const db = getDb()
  const rows = await db
    .select()
    .from(turnSubmissions)
    .where(eq(turnSubmissions.id, submissionId))
    .limit(1)
  return rows[0] ?? null
}

export async function getSubmissionByTurnId(turnId: number) {
  const db = getDb()
  const rows = await db
    .select()
    .from(turnSubmissions)
    .where(eq(turnSubmissions.turnId, turnId))
    .limit(1)
  return rows[0] ?? null
}

function extFromMime(mime: string, kind: MediaKind): string {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'video/quicktime') return 'mov'
  if (mime === 'video/3gpp') return '3gp'
  if (mime === 'audio/mpeg') return 'mp3'
  if (mime === 'audio/mp4' || mime === 'audio/x-m4a') return 'm4a'
  if (mime === 'audio/aac') return 'aac'
  if (mime === 'audio/wav') return 'wav'
  if (mime === 'audio/ogg') return 'ogg'
  if (mime === 'audio/webm') return 'webm'
  if (mime === 'video/mp4') return 'mp4'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/heic') return 'heic'
  if (mime === 'image/heif') return 'heif'
  return MEDIA_KIND_LIMITS[kind].extensions[0] ?? 'bin'
}

async function validateSubmissionBuffer(params: {
  buffer: Buffer
  allowedKinds: MediaKind[]
  maxDurationSec?: number
  durationSec?: number | null
  originalFilename?: string | null
}): Promise<{ mime: string; kind: MediaKind }> {
  const { buffer, allowedKinds, maxDurationSec, durationSec, originalFilename } = params

  if (buffer.length > MEDIA_UPLOAD_MAX_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'File too large' })
  }

  const detected = await fileTypeFromBuffer(buffer)
  const detectedMime = normalizeMimeType(detected?.mime ?? '')
  const kind = resolveMediaKind(detectedMime, originalFilename ?? '')
  if (!kind) {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported file type' })
  }
  if (!mediaKindAllowed(kind, allowedKinds)) {
    throw createError({ statusCode: 400, statusMessage: 'Media kind not allowed for this task' })
  }

  const mime = resolveMimeType(detectedMime, originalFilename ?? '', kind)
  const limits = MEDIA_KIND_LIMITS[kind]
  if (buffer.length > limits.maxBytes) {
    throw createError({ statusCode: 400, statusMessage: 'File exceeds size limit' })
  }
  if (!limits.mimeTypes.includes(mime)) {
    throw createError({ statusCode: 400, statusMessage: 'File type not allowed' })
  }

  const maxDuration = maxDurationForKind(kind, maxDurationSec)
  if (maxDuration != null) {
    if (durationSec == null || !Number.isFinite(durationSec) || durationSec <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'Duration required for this media type' })
    }
    if (durationSec > maxDuration) {
      throw createError({ statusCode: 400, statusMessage: 'Media exceeds maximum duration' })
    }
  }

  return { mime, kind }
}

export async function storeTurnSubmission(params: {
  teamId: number
  turnId: number
  buffer: Buffer
  originalFilename?: string | null
  durationSec?: number | null
}) {
  const { teamId, turnId, buffer, originalFilename, durationSec } = params
  const db = getDb()

  const turn = (await db.select().from(turns).where(eq(turns.id, turnId)).limit(1))[0]
  if (!turn || turn.teamId !== teamId) {
    throw createError({ statusCode: 404, statusMessage: 'Turn not found' })
  }
  if (turn.state !== 'scanned') {
    throw createError({ statusCode: 400, statusMessage: 'Upload not allowed now' })
  }
  if (!turn.taskId) {
    throw createError({ statusCode: 400, statusMessage: 'No task linked to turn' })
  }

  const existing = await getSubmissionByTurnId(turnId)
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Submission already uploaded' })
  }

  const task = (await db.select().from(tasks).where(eq(tasks.id, turn.taskId)).limit(1))[0]
  if (!task || task.activityType !== 'media') {
    throw createError({ statusCode: 400, statusMessage: 'Not a media task' })
  }

  const payload = parseActivityPayload(JSON.parse(task.activityPayloadJson))
  if (payload.type !== 'media') {
    throw createError({ statusCode: 400, statusMessage: 'Not a media task' })
  }

  const edition = await getEditionOrThrow(task.editionId)
  assertEditionLive(edition.status, 'media upload')

  const { mime, kind } = await validateSubmissionBuffer({
    buffer,
    allowedKinds: payload.allowedKinds,
    maxDurationSec: payload.maxDurationSec,
    durationSec,
    originalFilename,
  })

  const now = new Date()
  const inserted = await db
    .insert(turnSubmissions)
    .values({
      turnId,
      editionId: task.editionId,
      kind,
      mimeType: mime,
      originalFilename: originalFilename ?? null,
      fileSizeBytes: buffer.length,
      durationSec: durationSec ?? null,
      storedFilename: 'pending',
      createdAt: now,
    })
    .returning()

  const submission = inserted[0]
  if (!submission) throw createError({ statusCode: 500, statusMessage: 'Failed to save submission' })

  const ext = extFromMime(mime, kind)
  const storedFilename = `${turnId}-${submission.id}.${ext}`
  const dir = submissionDir(task.editionId)
  await mkdir(dir, { recursive: true })
  await writeFile(submissionFilePath(task.editionId, storedFilename), buffer)

  await db
    .update(turnSubmissions)
    .set({ storedFilename })
    .where(eq(turnSubmissions.id, submission.id))

  await db
    .update(turns)
    .set({ state: 'awaiting_crew' })
    .where(eq(turns.id, turnId))

  logGameEvent('turn.submission', {
    teamId,
    turnId,
    submissionId: submission.id,
    kind,
    bytes: buffer.length,
  })

  return {
    submissionId: submission.id,
    kind,
    mimeType: mime,
    fileSizeBytes: buffer.length,
  }
}
