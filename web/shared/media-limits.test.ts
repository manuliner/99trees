import { describe, expect, it } from 'vitest'
import {
  defersDurationCheck,
  formatAllowedKindsList,
  getMediaByteSizeError,
  isBrowserTranscodeMemoryError,
  maxDurationForKind,
  MEDIA_VIDEO_BROWSER_TRANSCODE_MAX_BYTES,
  MEDIA_VIDEO_SOURCE_MAX_BYTES,
  normalizeAllowedKinds,
  resolveMediaKind,
  resolveMimeType,
} from './media-limits'

describe('resolveMediaKind', () => {
  it('detects mp4 video from mime type', () => {
    expect(resolveMediaKind('video/mp4', 'signal-2026-05-15-123616.mp4')).toBe('video')
  })

  it('detects mp4 video from filename when mime is empty', () => {
    expect(resolveMediaKind('', 'signal-2026-05-15-123616.mp4')).toBe('video')
  })

  it('detects mp4 video from application/mp4 alias', () => {
    expect(resolveMediaKind('application/mp4', 'clip.mp4')).toBe('video')
  })

  it('prefers .mp4 extension over audio/mp4 mime (video transcode path)', () => {
    expect(resolveMediaKind('audio/mp4', 'BigBuckBunny.mp4')).toBe('video')
  })
})

describe('defersDurationCheck', () => {
  it('defers video duration before prepare when transcode on', () => {
    expect(
      defersDurationCheck({
        kind: 'video',
        clientTranscode: { video: true, photo: true, audio: false },
      }),
    ).toBe(true)
  })

  it('still defers duration after prepare when video transcode on', () => {
    expect(
      defersDurationCheck({
        kind: 'video',
        clientTranscode: { video: true, photo: true, audio: false },
        afterPrepare: true,
      }),
    ).toBe(true)
  })

  it('enforces duration after prepare when video transcode off', () => {
    expect(
      defersDurationCheck({
        kind: 'video',
        clientTranscode: { video: false, photo: true, audio: false },
        afterPrepare: true,
      }),
    ).toBe(false)
  })

  it('does not defer when video transcode off', () => {
    expect(
      defersDurationCheck({
        kind: 'video',
        clientTranscode: { video: false, photo: true, audio: false },
      }),
    ).toBe(false)
  })

  it('does not defer audio', () => {
    expect(
      defersDurationCheck({
        kind: 'audio',
        clientTranscode: { video: true, photo: true, audio: false },
      }),
    ).toBe(false)
  })
})

describe('getMediaByteSizeError', () => {
  const mb = (n: number) => n * 1024 * 1024

  it('rejects source video above browser transcode cap when transcode on', () => {
    expect(
      getMediaByteSizeError({
        kind: 'video',
        fileSize: mb(115),
        clientTranscode: undefined,
      }),
    ).toBe('sourceTooLargeForBrowser')
  })

  it('allows source video at browser transcode cap when transcode on', () => {
    expect(
      getMediaByteSizeError({
        kind: 'video',
        fileSize: MEDIA_VIDEO_BROWSER_TRANSCODE_MAX_BYTES,
        clientTranscode: { video: true, photo: true, audio: false },
      }),
    ).toBeNull()
  })

  it('rejects source video just above browser transcode cap', () => {
    expect(
      getMediaByteSizeError({
        kind: 'video',
        fileSize: MEDIA_VIDEO_BROWSER_TRANSCODE_MAX_BYTES + 1,
        clientTranscode: { video: true, photo: true, audio: false },
      }),
    ).toBe('sourceTooLargeForBrowser')
  })

  it('rejects large video when transcode explicitly off', () => {
    expect(
      getMediaByteSizeError({
        kind: 'video',
        fileSize: mb(115),
        clientTranscode: { video: false, photo: true, audio: false },
      }),
    ).toBe('tooLarge')
  })

  it('enforces upload cap after prepare even when transcode on', () => {
    expect(
      getMediaByteSizeError({
        kind: 'video',
        fileSize: mb(25),
        clientTranscode: { video: true, photo: true, audio: false },
        afterPrepare: true,
      }),
    ).toBe('tooLarge')
  })

  it('rejects source video above 250MB with browser cap error when transcode on', () => {
    expect(
      getMediaByteSizeError({
        kind: 'video',
        fileSize: MEDIA_VIDEO_SOURCE_MAX_BYTES + 1,
        clientTranscode: { video: true, photo: true, audio: false },
      }),
    ).toBe('sourceTooLargeForBrowser')
  })

  it('rejects large photo source when compression on', () => {
    expect(
      getMediaByteSizeError({
        kind: 'photo',
        fileSize: mb(60),
        clientTranscode: { video: true, photo: true, audio: false },
      }),
    ).toBe('sourceTooLarge')
  })

  it('uses 60s default max duration for video when task override unset', () => {
    expect(maxDurationForKind('video', undefined)).toBe(60)
  })

  it('uses task max duration override for video (not capped to 60)', () => {
    expect(maxDurationForKind('video', 600)).toBe(600)
  })

  it('clamps task video duration to absolute max', () => {
    expect(maxDurationForKind('video', 9999)).toBe(600)
  })

  it('classifies audio/mp4 mislabel as video via extension for limits', () => {
    const kind = resolveMediaKind('audio/mp4', 'clip.mp4')!
    expect(kind).toBe('video')
    expect(
      getMediaByteSizeError({
        kind,
        fileSize: mb(115),
        clientTranscode: undefined,
      }),
    ).toBe('sourceTooLargeForBrowser')
  })
})

describe('isBrowserTranscodeMemoryError', () => {
  it('detects RuntimeError out of bounds', () => {
    const err = new Error('memory access out of bounds')
    err.name = 'RuntimeError'
    expect(isBrowserTranscodeMemoryError(err)).toBe(true)
  })

  it('detects memory in message', () => {
    expect(isBrowserTranscodeMemoryError(new Error('allocation failed: memory'))).toBe(true)
  })

  it('ignores unrelated errors', () => {
    expect(isBrowserTranscodeMemoryError(new Error('encode failed'))).toBe(false)
  })
})

describe('resolveMimeType', () => {
  it('falls back to mp4 mime from filename', () => {
    expect(resolveMimeType('', 'signal.mp4', 'video')).toBe('video/mp4')
  })
})

describe('normalizeAllowedKinds', () => {
  it('defaults to photo when empty', () => {
    expect(normalizeAllowedKinds([])).toEqual(['photo'])
  })
})

describe('formatAllowedKindsList', () => {
  it('formats a single kind in German', () => {
    expect(formatAllowedKindsList(['photo'], 'de')).toBe('ein Foto')
  })

  it('formats video-only hint in English', () => {
    expect(formatAllowedKindsList(['video'], 'en')).toBe('a video')
  })
})
