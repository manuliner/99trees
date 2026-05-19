import { existsSync, readFileSync } from 'node:fs'
import { requireTeam } from '../../../utils/team-session'
import { storeTurnSubmission } from '../../../services/media-submission'
import { MEDIA_UPLOAD_MAX_BYTES } from '#shared/media-limits'

export default defineEventHandler(async (event) => {
  const team = await requireTeam(event)
  const turnId = Number(getRouterParam(event, 'id'))

  const form = await readMultipartFormData(event)
  const filePart = form?.find((p) => p.name === 'file' && p.data?.length)
  if (!filePart?.data?.length) {
    throw createError({ statusCode: 400, statusMessage: 'file required' })
  }
  if (filePart.data.length > MEDIA_UPLOAD_MAX_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'File too large' })
  }

  const durationRaw = form?.find((p) => p.name === 'durationSec')?.data?.toString('utf8')
  const durationSec = durationRaw != null && durationRaw !== '' ? Number(durationRaw) : null

  return storeTurnSubmission({
    teamId: team.id,
    turnId,
    buffer: Buffer.from(filePart.data),
    originalFilename: filePart.filename ?? null,
    durationSec: Number.isFinite(durationSec) ? durationSec : null,
  })
})
