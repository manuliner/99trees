import { writeLog } from './log'

export function logGameEvent(
  type: string,
  payload: Record<string, unknown>,
) {
  writeLog('info', type, { type, ...payload })
}
