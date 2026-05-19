import type { ClientTranscodePolicy, MediaKind } from '#shared/types'
import {
  defersDurationCheck,
  getMediaByteSizeError,
  maxDurationForKind,
  MEDIA_KIND_LIMITS,
  mediaKindAllowed,
  resolveMediaKind,
  resolveMimeType,
} from '#shared/media-limits'

export {
  defersDurationCheck,
  getMediaByteSizeError,
  MEDIA_KIND_LIMITS,
  maxDurationForKind,
  formatAllowedKindsList,
  normalizeAllowedKinds,
} from '#shared/media-limits'

export function acceptAttributeForKinds(kinds: readonly MediaKind[]): string {
  const parts = new Set<string>()
  for (const kind of kinds) {
    for (const mime of MEDIA_KIND_LIMITS[kind].mimeTypes) {
      parts.add(mime)
    }
    for (const ext of MEDIA_KIND_LIMITS[kind].extensions) {
      parts.add(`.${ext}`)
    }
  }
  return [...parts].join(',')
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function readMediaDurationSec(file: File, kind: MediaKind): Promise<number | null> {
  if (kind === 'photo') return null

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const cleanup = () => URL.revokeObjectURL(url)

    if (kind === 'video') {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        const duration = Number.isFinite(video.duration) ? video.duration : null
        cleanup()
        resolve(duration)
      }
      video.onerror = () => {
        cleanup()
        resolve(null)
      }
      video.src = url
      return
    }

    const audio = document.createElement('audio')
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : null
      cleanup()
      resolve(duration)
    }
    audio.onerror = () => {
      cleanup()
      resolve(null)
    }
    audio.src = url
  })
}

export async function validateMediaFile(params: {
  file: File
  allowedKinds: readonly MediaKind[]
  maxDurationSec?: number
  clientTranscode?: ClientTranscodePolicy
  /** Set after prepare/transcode — always enforces upload byte limits. */
  afterPrepare?: boolean
}): Promise<{ kind: MediaKind; durationSec: number | null }> {
  const { file, allowedKinds, maxDurationSec, clientTranscode, afterPrepare } = params
  const kind = resolveMediaKind(file.type, file.name)
  if (!kind) {
    throw new Error('unsupportedType')
  }
  if (!mediaKindAllowed(kind, allowedKinds)) {
    throw new Error('kindNotAllowed')
  }

  const byteSizeError = getMediaByteSizeError({
    kind,
    fileSize: file.size,
    clientTranscode,
    afterPrepare,
  })
  if (byteSizeError) {
    throw new Error(byteSizeError)
  }

  const limits = MEDIA_KIND_LIMITS[kind]

  const mime = resolveMimeType(file.type, file.name, kind)
  if (!limits.mimeTypes.includes(mime)) {
    throw new Error('unsupportedType')
  }

  const durationSec = await readMediaDurationSec(file, kind)
  const maxDuration = maxDurationForKind(kind, maxDurationSec)
  const skipDurationReject = defersDurationCheck({ kind, clientTranscode, afterPrepare })
  if (maxDuration != null && !skipDurationReject) {
    if (durationSec == null) throw new Error('durationUnknown')
    if (durationSec > maxDuration) throw new Error('tooLong')
  }

  return { kind, durationSec }
}
