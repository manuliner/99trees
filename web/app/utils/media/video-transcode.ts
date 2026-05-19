import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { buildVideoEncodePasses, buildVideoTrimCopyArgs } from '#shared/media-transcode-passes'
import {
  isBrowserTranscodeMemoryError,
  maxDurationForKind,
  MEDIA_KIND_LIMITS,
  MEDIA_VIDEO_BROWSER_TRANSCODE_MAX_BYTES,
} from '#shared/media-limits'
import { readMediaDurationSec } from './validate'

const FFMPEG_CORE_VERSION = '0.12.6'
const TARGET_BYTES = 15 * 1024 * 1024
const OUTPUT_MAX_BYTES = MEDIA_KIND_LIMITS.video.maxBytes
/** Stream-copy trim before re-encode to cut decode work on large but allowed sources. */
const PRETRIM_SOURCE_BYTES = 50 * 1024 * 1024

export type VideoTranscodeErrorCode =
  | 'transcodeUnavailable'
  | 'transcodeFailed'
  | 'sourceTooLargeForBrowser'

export class VideoTranscodeError extends Error {
  readonly code: VideoTranscodeErrorCode
  /** Human-readable detail (shown in dev builds). */
  readonly detail?: string

  constructor(code: VideoTranscodeErrorCode, options?: { cause?: unknown; detail?: string }) {
    super(code)
    this.name = 'VideoTranscodeError'
    this.code = code
    this.detail = options?.detail
    if (options?.cause instanceof Error) {
      this.cause = options.cause
    }
  }
}

let ffmpegInstance: FFmpeg | null = null
let ffmpegLoadPromise: Promise<FFmpeg> | null = null

async function loadFfmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance
  if (ffmpegLoadPromise) return ffmpegLoadPromise

  ffmpegLoadPromise = (async () => {
    const ffmpeg = new FFmpeg()
    const baseURL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })
    }
    catch (cause) {
      ffmpegLoadPromise = null
      throw new VideoTranscodeError('transcodeUnavailable', {
        cause,
        detail: cause instanceof Error ? cause.message : 'ffmpeg wasm load failed',
      })
    }
    ffmpegInstance = ffmpeg
    return ffmpeg
  })()

  return ffmpegLoadPromise
}

function outputFileName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, '') || 'video'
  return `${base}-compressed.mp4`
}

function inputFileName(file: File): string {
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'mp4'
  return `input.${ext}`
}

async function readOutputBlob(ffmpeg: FFmpeg): Promise<Blob | null> {
  const data = await ffmpeg.readFile('output.mp4')
  const raw = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data))
  if (raw.byteLength === 0) return null
  const bytes = new Uint8Array(raw)
  return new Blob([bytes], { type: 'video/mp4' })
}

async function replaceInputWithOutput(ffmpeg: FFmpeg, inputName: string): Promise<boolean> {
  const data = await ffmpeg.readFile('output.mp4')
  const raw = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data))
  if (raw.byteLength === 0) return false
  await ffmpeg.deleteFile(inputName)
  await ffmpeg.writeFile(inputName, raw)
  try {
    await ffmpeg.deleteFile('output.mp4')
  }
  catch {
    // ignore
  }
  return true
}

async function runFfmpegPass(
  ffmpeg: FFmpeg,
  inputName: string,
  passArgs: readonly string[],
): Promise<{ exitCode: number; blob: Blob | null }> {
  try {
    await ffmpeg.deleteFile('output.mp4')
  }
  catch {
    // first pass — no prior output
  }

  const exitCode = await ffmpeg.exec(['-y', '-i', inputName, ...passArgs])
  if (exitCode !== 0) {
    return { exitCode, blob: null }
  }
  const blob = await readOutputBlob(ffmpeg)
  return { exitCode, blob }
}

export async function transcodeVideoFile(
  file: File,
  options?: { onProgress?: (ratio: number) => void; maxDurationSec?: number },
): Promise<File> {
  const maxDurationSec = maxDurationForKind('video', options?.maxDurationSec) ?? 60
  const durationSec = await readMediaDurationSec(file, 'video')
  const needsTrim = durationSec != null && durationSec > maxDurationSec
  const needsCompress = file.size > OUTPUT_MAX_BYTES

  if (!needsTrim && !needsCompress) {
    return file
  }

  if (file.size > MEDIA_VIDEO_BROWSER_TRANSCODE_MAX_BYTES) {
    throw new VideoTranscodeError('sourceTooLargeForBrowser', {
      detail: `${file.size} bytes > ${MEDIA_VIDEO_BROWSER_TRANSCODE_MAX_BYTES} browser cap`,
    })
  }

  const ffmpeg = await loadFfmpeg()
  const inputName = inputFileName(file)
  const passes = buildVideoEncodePasses(maxDurationSec)
  const failures: string[] = []

  const progressHandler = ({ progress }: { progress: number }) => {
    options?.onProgress?.(Math.min(1, Math.max(0, progress)))
  }
  ffmpeg.on('progress', progressHandler)

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file))

    const shouldPreTrim = needsTrim || file.size > PRETRIM_SOURCE_BYTES
    if (shouldPreTrim) {
      const { exitCode, blob } = await runFfmpegPass(ffmpeg, inputName, buildVideoTrimCopyArgs(maxDurationSec))
      if (exitCode === 0 && blob) {
        if (!needsCompress && blob.size <= OUTPUT_MAX_BYTES) {
          return new File([blob], outputFileName(file.name), { type: 'video/mp4' })
        }
        if (await replaceInputWithOutput(ffmpeg, inputName)) {
          failures.push('trim-copy: ok')
        }
        else {
          failures.push('trim-copy: empty output')
        }
      }
      else {
        failures.push(`trim-copy: exit ${exitCode}`)
      }
    }

    for (const passArgs of passes) {
      const { exitCode, blob } = await runFfmpegPass(ffmpeg, inputName, passArgs)
      if (exitCode !== 0) {
        failures.push(`encode: exit ${exitCode}`)
        continue
      }
      if (!blob) {
        failures.push('encode: empty output')
        continue
      }

      if (blob.size <= TARGET_BYTES || blob.size <= OUTPUT_MAX_BYTES) {
        return new File([blob], outputFileName(file.name), { type: 'video/mp4' })
      }
      failures.push(`encode: output ${blob.size} bytes > cap`)
    }

    const detail = failures.length > 0 ? failures.join('; ') : 'no pass produced acceptable output'
    throw new VideoTranscodeError('transcodeFailed', { detail })
  }
  catch (e) {
    if (e instanceof VideoTranscodeError) throw e
    const message = e instanceof Error ? e.message : String(e)
    if (isBrowserTranscodeMemoryError(e)) {
      throw new VideoTranscodeError('sourceTooLargeForBrowser', { cause: e, detail: message })
    }
    throw new VideoTranscodeError('transcodeFailed', { cause: e, detail: message })
  }
  finally {
    ffmpeg.off('progress', progressHandler)
    try {
      await ffmpeg.deleteFile(inputName)
    }
    catch {
      // ignore cleanup errors
    }
    try {
      await ffmpeg.deleteFile('output.mp4')
    }
    catch {
      // ignore
    }
  }
}
