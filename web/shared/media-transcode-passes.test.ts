import { describe, expect, it } from 'vitest'
import { buildVideoEncodePasses, buildVideoTrimCopyArgs } from './media-transcode-passes'

describe('buildVideoEncodePasses', () => {
  it('includes -fs output cap and -t on every pass', () => {
    for (const pass of buildVideoEncodePasses(60)) {
      expect(pass).toContain('-fs')
      expect(pass).toContain('-t')
      expect(pass[pass.indexOf('-t') + 1]).toBe('60')
    }
  })

  it('leads with bitrate pass for long max duration', () => {
    const passes = buildVideoEncodePasses(600)
    expect(passes[0]).toContain('-b:v')
    expect(passes[passes.length - 1]).toContain('-b:v')
  })
})

describe('buildVideoTrimCopyArgs', () => {
  it('stream-copies with duration cap', () => {
    expect(buildVideoTrimCopyArgs(600)).toEqual([
      '-t', '600',
      '-c', 'copy',
      '-movflags', '+faststart',
      'output.mp4',
    ])
  })
})
