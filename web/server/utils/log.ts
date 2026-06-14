type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export function writeLog(
  level: LogLevel,
  message: string,
  fields?: Record<string, unknown>,
): void {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...fields,
  })

  if (level === 'error') {
    console.error(line)
  }
  else if (level === 'warn') {
    console.warn(line)
  }
  else {
    console.log(line)
  }
}
