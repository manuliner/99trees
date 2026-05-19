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
  'Already waiting for crew on another field': 'errors.alreadyWaitingForCrew',
  'Continue playing only during performance wait': 'errors.continuePlayingOnlyDuringPerformance',
  'Continue playing only during crew wait': 'errors.continuePlayingOnlyDuringCrew',
  'Continue playing only during co-op wait': 'errors.continuePlayingOnlyDuringCoop',
  'No co-op task active': 'errors.noCoopTask',
  'No co-op depot on this field': 'errors.noCoopDepot',
  'Co-op depot already open on this field': 'errors.coopDepotOpen',
  'Co-op depot already has a partner': 'errors.coopDepotHasPartner',
  'Cannot join your own co-op depot': 'errors.ownCoopDepot',
  'Field already completed for this team': 'errors.fieldAlreadyCompleted',
  'No co-op link with this team': 'errors.noCoopLink',
  'Co-op bonus already claimed': 'errors.coopBonusClaimed',
  'Invalid team QR code': 'errors.invalidTeamQr',
  'File too large': 'play.media.errors.tooLarge',
  'File exceeds size limit': 'play.media.errors.tooLarge',
  'Unsupported file type': 'play.media.errors.unsupportedType',
  'File type not allowed': 'play.media.errors.unsupportedType',
  'Media kind not allowed for this task': 'play.media.errors.kindNotAllowed',
  'Media exceeds maximum duration': 'play.media.errors.tooLong',
  'Duration required for this media type': 'play.media.errors.durationUnknown',
  'Upload not allowed now': 'play.media.errors.uploadFailed',
  'Submission already uploaded': 'play.media.errors.uploadFailed',
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
