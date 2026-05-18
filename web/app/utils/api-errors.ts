/** Map known English API statusMessage strings to i18n keys. */
const API_ERROR_KEYS: Record<string, string> = {
  'Invalid team or PIN': 'errors.invalidTeamOrPin',
  'Game is not live yet': 'errors.gameNotLiveYet',
  'Game is not live': 'errors.gameNotLive',
  'Team name already taken': 'errors.teamNameTaken',
  'Finish or abandon current turn first': 'errors.finishOrAbandonTurn',
  'Scan not allowed now': 'errors.scanNotAllowed',
  'Invalid QR code': 'errors.invalidQr',
  'No quiz task active': 'errors.noQuizTask',
  'Task not found': 'errors.taskNotFound',
  'Answer is not a valid choice': 'errors.answerInvalid',
  'No active search turn': 'errors.noActiveSearchTurn',
  'Hint not unlocked yet': 'errors.hintNotUnlocked',
  'Cannot abandon this turn': 'errors.cannotAbandon',
  'Wait for all hints or use Reveal All first': 'errors.waitForHints',
  'Task not completed yet': 'errors.taskNotCompleted',
  'Too many requests': 'errors.tooManyRequests',
  'Team session required': 'errors.teamSessionRequired',
}

const WRONG_SPOT_RE = /^Wrong spot — you need field (\d+)$/

export function mapApiError(
  statusMessage: string | undefined,
  fallbackKey: string,
  t: (key: string, params?: Record<string, unknown>) => string,
): string {
  if (!statusMessage) return t(fallbackKey)
  const key = API_ERROR_KEYS[statusMessage]
  if (key) return t(key)
  const wrongSpot = statusMessage.match(WRONG_SPOT_RE)
  if (wrongSpot) return t('errors.wrongSpot', { field: wrongSpot[1] })
  const notLive = statusMessage.match(/^Game is not live — cannot (.+)$/)
  if (notLive) return t('errors.gameNotLive')
  return statusMessage
}
