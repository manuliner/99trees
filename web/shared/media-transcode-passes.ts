import { MEDIA_KIND_LIMITS } from './media-limits'

const OUTPUT_MAX_BYTES = MEDIA_KIND_LIMITS.video.maxBytes

function bitrateLimitedPass(maxDurationSec: number): readonly string[] {
  const t = String(maxDurationSec)
  const fs = String(OUTPUT_MAX_BYTES)
  const audioKbps = 64
  const totalKbps = Math.floor((OUTPUT_MAX_BYTES * 8) / maxDurationSec / 1000 * 0.92)
  const videoKbps = Math.max(120, totalKbps - audioKbps)
  return [
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-b:v', `${videoKbps}k`,
    '-maxrate', `${videoKbps}k`,
    '-bufsize', `${videoKbps * 2}k`,
    '-vf', 'scale=min(640\\,iw):min(360\\,ih):force_original_aspect_ratio=decrease',
    '-movflags', '+faststart',
    '-c:a', 'aac',
    '-b:a', `${audioKbps}k`,
    '-ac', '2',
    '-t', t,
    '-fs', fs,
    'output.mp4',
  ]
}

/** ffmpeg argument tails (after `-i input`) for client-side video compression. */
export function buildVideoEncodePasses(maxDurationSec: number): readonly (readonly string[])[] {
  const t = String(maxDurationSec)
  const fs = String(OUTPUT_MAX_BYTES)
  const standard: (readonly string[])[] = [
    [
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '28',
      '-vf', 'scale=min(1280\\,iw):min(720\\,ih):force_original_aspect_ratio=decrease',
      '-movflags', '+faststart',
      '-c:a', 'aac',
      '-b:a', '96k',
      '-ac', '2',
      '-t', t,
      '-fs', fs,
      'output.mp4',
    ],
    [
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '32',
      '-vf', 'scale=min(960\\,iw):min(540\\,ih):force_original_aspect_ratio=decrease',
      '-movflags', '+faststart',
      '-c:a', 'aac',
      '-b:a', '64k',
      '-ac', '2',
      '-t', t,
      '-fs', fs,
      'output.mp4',
    ],
    [
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '35',
      '-vf', 'scale=min(640\\,iw):min(360\\,ih):force_original_aspect_ratio=decrease',
      '-movflags', '+faststart',
      '-an',
      '-t', t,
      '-fs', fs,
      'output.mp4',
    ],
  ]

  if (maxDurationSec > 90) {
    return [bitrateLimitedPass(maxDurationSec), ...standard, bitrateLimitedPass(maxDurationSec)]
  }
  return [...standard, bitrateLimitedPass(maxDurationSec)]
}

export function buildVideoTrimCopyArgs(maxDurationSec: number): readonly string[] {
  return [
    '-t', String(maxDurationSec),
    '-c', 'copy',
    '-movflags', '+faststart',
    'output.mp4',
  ]
}
