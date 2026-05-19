import { existsSync, readFileSync } from 'node:fs'
import { crewSubmissionContentPath, getSubmissionById } from '../../../../services/media-submission'
import { requireStaffEdition } from '../../../../utils/staff-session'

export default defineEventHandler(async (event) => {
  const submissionId = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(submissionId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid submission id' })
  }

  const submission = await getSubmissionById(submissionId)
  if (!submission) {
    throw createError({ statusCode: 404, statusMessage: 'Submission not found' })
  }

  await requireStaffEdition(event, submission.editionId)

  const path = crewSubmissionContentPath(submission.editionId, submission.storedFilename)
  if (!existsSync(path)) {
    throw createError({ statusCode: 404, statusMessage: 'File not found' })
  }

  const body = readFileSync(path)
  setHeader(event, 'Content-Type', submission.mimeType)
  setHeader(event, 'Content-Length', body.length)
  setHeader(event, 'Cache-Control', 'private, no-store')
  return body
})
