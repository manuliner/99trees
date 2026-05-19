export type ActivityBoardType = 'quiz' | 'performance' | 'media' | 'coop'

const ACTIVITY_BOARD_LETTERS: Record<ActivityBoardType, string> = {
  quiz: 'q',
  performance: 'p',
  media: 'm',
  coop: 'c',
}

export function activityBoardLetter(type: ActivityBoardType): string {
  return ACTIVITY_BOARD_LETTERS[type]
}
