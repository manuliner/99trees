import type { H3Event } from 'h3'

export function assertEditionLive(status: string, action = 'action') {
  if (status !== 'live') {
    throw createError({
      statusCode: 403,
      statusMessage: `Game is not live — cannot ${action}`,
    })
  }
}
