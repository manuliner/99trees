export function pickRollDicePrompt(prompts: string[]): string {
  if (prompts.length === 0) return ''
  const i = Math.floor(Math.random() * prompts.length)
  return prompts[i]!
}
