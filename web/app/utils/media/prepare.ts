import type { ClientTranscodePolicy } from '#shared/types'
import type { MediaKind } from '#shared/types'

export async function prepareMediaFile(
  file: File,
  kind: MediaKind,
  policy: ClientTranscodePolicy,
  options?: { onProgress?: (ratio: number) => void; maxDurationSec?: number },
): Promise<File> {
  if (kind === 'photo' && policy.photo) {
    const imageCompression = (await import('browser-image-compression')).default
    const compressed = await imageCompression(file, {
      maxSizeMB: 2.8,
      maxWidthOrHeight: 2048,
      useWebWorker: true,
      fileType: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
    })
    return compressed
  }

  if (kind === 'video' && policy.video) {
    const { transcodeVideoFile } = await import('./video-transcode')
    return transcodeVideoFile(file, {
      onProgress: options?.onProgress,
      maxDurationSec: options?.maxDurationSec,
    })
  }

  if (kind === 'audio' && policy.audio) {
    // Audio transcode not implemented for MVP — pass through when enabled flag is set later.
    return file
  }

  return file
}
