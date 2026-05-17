const ROLL_DICE_PROMPTS = [
  'Roll the dice',
  'Your move — roll the dice!',
  'Fate awaits — give the dice a shake',
  'Tap the dice and let luck decide',
  'Ready? Roll for your next field',
  'The board is calling — roll the dice',
  'Send the dice flying',
  'One roll away from adventure',
  'Spin those pixels of destiny',
  'Roll to see where you land',
  'Shake the dice and start your turn',
  'Let the dice pick your path',
  'Time to roll — the festival waits',
  'Hit the dice and chase the next station',
  'Your next field is one roll away',
  'Roll now — the crowd is watching',
  'Dice up! See how far you go',
  'Take a chance — roll the dice',
  'The die is cast… well, almost — roll it!',
  'Fortune favors the bold — roll the dice',
] as const

export function pickRollDicePrompt(): string {
  const i = Math.floor(Math.random() * ROLL_DICE_PROMPTS.length)
  return ROLL_DICE_PROMPTS[i]!
}
