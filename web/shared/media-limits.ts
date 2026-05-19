import type { ClientTranscodePolicy } from './types'
import { resolveClientTranscodePolicy } from './types'

export type MediaKind = 'photo' | 'video' | 'audio'

export interface MediaKindLimits {
  maxBytes: number
  maxDurationSec: number | null
  extensions: readonly string[]
  mimeTypes: readonly string[]
}

export const MEDIA_KIND_LIMITS: Record<MediaKind, MediaKindLimits> = {
  photo: {
    maxBytes: 3 * 1024 * 1024,
    maxDurationSec: null,
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  },
  video: {
    maxBytes: 20 * 1024 * 1024,
    maxDurationSec: 60,
    extensions: ['mp4', 'mov', '3gp'],
    mimeTypes: ['video/mp4', 'video/quicktime', 'video/3gpp'],
  },
  audio: {
    maxBytes: 5 * 1024 * 1024,
    maxDurationSec: 90,
    extensions: ['m4a', 'mp3', 'aac', 'wav', 'ogg', 'webm'],
    mimeTypes: [
      'audio/mp4',
      'audio/mpeg',
      'audio/aac',
      'audio/wav',
      'audio/ogg',
      'audio/webm',
      'audio/x-m4a',
    ],
  },
}

export const MEDIA_UPLOAD_MAX_BYTES = 22 * 1024 * 1024

/** Max original video size when client transcode is enabled (absolute server-side cap). */
export const MEDIA_VIDEO_SOURCE_MAX_BYTES = 250 * 1024 * 1024

/** Max original video size for in-browser ffmpeg (wasm memory). */
export const MEDIA_VIDEO_BROWSER_TRANSCODE_MAX_BYTES = 80 * 1024 * 1024

/** Max original photo size when client compression is enabled. */
export const MEDIA_PHOTO_SOURCE_MAX_BYTES = 50 * 1024 * 1024

/** Browser- or OS-specific MIME aliases mapped to canonical whitelist entries. */
const MIME_ALIASES: Record<string, string> = {
  'video/x-mp4': 'video/mp4',
  'application/mp4': 'video/mp4',
}

export const MEDIA_EXTENSION_MAP: Record<string, { kind: MediaKind; mime: string }> = {
  jpg: { kind: 'photo', mime: 'image/jpeg' },
  jpeg: { kind: 'photo', mime: 'image/jpeg' },
  png: { kind: 'photo', mime: 'image/png' },
  webp: { kind: 'photo', mime: 'image/webp' },
  heic: { kind: 'photo', mime: 'image/heic' },
  heif: { kind: 'photo', mime: 'image/heif' },
  mp4: { kind: 'video', mime: 'video/mp4' },
  mov: { kind: 'video', mime: 'video/quicktime' },
  '3gp': { kind: 'video', mime: 'video/3gpp' },
  m4a: { kind: 'audio', mime: 'audio/mp4' },
  mp3: { kind: 'audio', mime: 'audio/mpeg' },
  aac: { kind: 'audio', mime: 'audio/aac' },
  wav: { kind: 'audio', mime: 'audio/wav' },
  ogg: { kind: 'audio', mime: 'audio/ogg' },
  webm: { kind: 'audio', mime: 'audio/webm' },
}

export function normalizeMimeType(mime: string): string {
  const trimmed = mime.trim().toLowerCase()
  return MIME_ALIASES[trimmed] ?? trimmed
}

export function extensionFromFilename(filename: string): string | null {
  const base = filename.split(/[/\\]/).pop() ?? filename
  const dot = base.lastIndexOf('.')
  if (dot <= 0 || dot === base.length - 1) return null
  return base.slice(dot + 1).toLowerCase()
}

export function mediaFromExtension(ext: string): { kind: MediaKind; mime: string } | null {
  return MEDIA_EXTENSION_MAP[ext.toLowerCase()] ?? null
}

export function inferMediaKindFromMime(mime: string): MediaKind | null {
  const normalized = normalizeMimeType(mime)
  if (!normalized) return null
  if (normalized.startsWith('image/')) return 'photo'
  if (normalized.startsWith('video/')) return 'video'
  if (normalized.startsWith('audio/')) return 'audio'
  return null
}

export function resolveMediaKind(mime: string, filename: string): MediaKind | null {
  const ext = extensionFromFilename(filename)
  const fromExt = ext ? mediaFromExtension(ext) : null
  // Prefer filename extension over MIME (e.g. .mp4 must stay video even when MIME is audio/mp4).
  if (fromExt) return fromExt.kind
  return inferMediaKindFromMime(mime)
}

export function resolveMimeType(mime: string, filename: string, kind: MediaKind): string {
  const normalized = normalizeMimeType(mime)
  if (normalized && MEDIA_KIND_LIMITS[kind].mimeTypes.includes(normalized)) {
    return normalized
  }
  const ext = extensionFromFilename(filename)
  const fromExt = ext ? mediaFromExtension(ext) : null
  if (fromExt?.kind === kind) return fromExt.mime
  return normalized
}

export function mediaKindAllowed(kind: MediaKind, allowedKinds: readonly MediaKind[]): boolean {
  return allowedKinds.includes(kind)
}

const MEDIA_KIND_ORDER: readonly MediaKind[] = ['photo', 'video', 'audio']

export function normalizeAllowedKinds(kinds: readonly MediaKind[] | undefined): MediaKind[] {
  if (!kinds?.length) return ['photo']
  const allowed = new Set<MediaKind>(MEDIA_KIND_ORDER)
  const normalized = kinds.filter((kind): kind is MediaKind => allowed.has(kind))
  return normalized.length > 0 ? normalized : ['photo']
}

export function formatAllowedKindsList(
  kinds: readonly MediaKind[],
  locale: string,
): string {
  const ordered = MEDIA_KIND_ORDER.filter((kind) => kinds.includes(kind))
  const labels = ordered.map((kind) => {
    if (locale.startsWith('de')) {
      if (kind === 'photo') return 'ein Foto'
      if (kind === 'video') return 'ein Video'
      return 'eine Audiodatei'
    }
    if (kind === 'photo') return 'a photo'
    if (kind === 'video') return 'a video'
    return 'an audio file'
  })
  return new Intl.ListFormat(locale, { style: 'long', type: 'disjunction' }).format(labels)
}

export type MediaByteSizeError = 'tooLarge' | 'sourceTooLarge' | 'sourceTooLargeForBrowser'

/** ffmpeg.wasm OOM / linear memory failures — map to sourceTooLargeForBrowser in UI. */
export function isBrowserTranscodeMemoryError(error: unknown): boolean {
  if (error instanceof Error && error.name === 'RuntimeError') return true
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase()
  return message.includes('out of bounds') || message.includes('memory')
}

function defersByteSizeCheck(
  kind: MediaKind,
  clientTranscode: ClientTranscodePolicy,
): boolean {
  if (kind === 'video' && clientTranscode.video) return true
  if (kind === 'photo' && clientTranscode.photo) return true
  return false
}

/**
 * Skip client max-duration rejection when ffmpeg trims video (before and after prepare).
 * Byte limits still apply after prepare via getMediaByteSizeError.
 */
export function defersDurationCheck(params: {
  kind: MediaKind
  clientTranscode?: Partial<ClientTranscodePolicy> | null
  afterPrepare?: boolean
}): boolean {
  const policy = resolveClientTranscodePolicy(params.clientTranscode)
  return params.kind === 'video' && policy.video
}

/** Pure byte-limit check (client validate + unit tests). */
export function getMediaByteSizeError(params: {
  kind: MediaKind
  fileSize: number
  clientTranscode?: Partial<ClientTranscodePolicy> | null
  afterPrepare?: boolean
}): MediaByteSizeError | null {
  const { kind, fileSize, afterPrepare } = params
  const policy = resolveClientTranscodePolicy(params.clientTranscode)
  const limits = MEDIA_KIND_LIMITS[kind]
  const skipByteSize = !afterPrepare && defersByteSizeCheck(kind, policy)

  if (!skipByteSize && fileSize > limits.maxBytes) {
    return 'tooLarge'
  }
  if (skipByteSize && kind === 'video' && fileSize > MEDIA_VIDEO_BROWSER_TRANSCODE_MAX_BYTES) {
    return 'sourceTooLargeForBrowser'
  }
  if (skipByteSize && kind === 'video' && fileSize > MEDIA_VIDEO_SOURCE_MAX_BYTES) {
    return 'sourceTooLarge'
  }
  if (skipByteSize && kind === 'photo' && fileSize > MEDIA_PHOTO_SOURCE_MAX_BYTES) {
    return 'sourceTooLarge'
  }
  return null
}

/** Upper bound for per-task video duration overrides (admin / import). */
export const MEDIA_VIDEO_TASK_MAX_DURATION_SEC = 600

export function maxDurationForKind(
  kind: MediaKind,
  taskMaxDurationSec: number | undefined,
): number | null {
  const limit = MEDIA_KIND_LIMITS[kind].maxDurationSec
  if (limit == null) return null
  if (taskMaxDurationSec != null && taskMaxDurationSec > 0) {
    if (kind === 'video') {
      return Math.min(taskMaxDurationSec, MEDIA_VIDEO_TASK_MAX_DURATION_SEC)
    }
    return taskMaxDurationSec
  }
  return limit
}
