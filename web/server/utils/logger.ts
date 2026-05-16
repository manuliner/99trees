export function logGameEvent(
  type: string,
  payload: Record<string, unknown>,
) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      type,
      ...payload,
    }),
  )
}
