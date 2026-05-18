import type { AppLocale } from './localized'
import { normalizeLocalizedStringList, parseLocalizedStringList, resolveLocalizedList } from './localized'
import type {
  ActivityPayload,
  PerformanceActivityPayload,
  QuizActivityPayload,
  QuizInputMode,
  TeamQuizActivityPayload,
} from './types'

export type TeamActivityPayload = TeamQuizActivityPayload | PerformanceActivityPayload

export function normalizeQuizInputMode(payload: QuizActivityPayload): QuizInputMode {
  return payload.inputMode ?? 'freeText'
}

export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase()
}

export function quizPayloadForTeam(payload: QuizActivityPayload): TeamQuizActivityPayload {
  const inputMode = normalizeQuizInputMode(payload)
  const team: TeamQuizActivityPayload = {
    type: 'quiz',
    question: payload.question,
    inputMode,
  }
  if (inputMode === 'multipleChoice' && payload.choices) {
    team.choices = payload.choices
  }
  return team
}

export function isAnswerInChoices(
  payload: QuizActivityPayload,
  submitted: string,
  locale: AppLocale,
): boolean {
  const choices = resolveLocalizedList(payload.choices ?? { de: [], en: [] }, locale)
  const normalized = normalizeAnswer(submitted)
  return choices.some((c) => normalizeAnswer(c) === normalized)
}

export function isQuizAnswerCorrect(
  payload: QuizActivityPayload,
  submitted: string,
  locale: AppLocale,
): boolean {
  const normalized = normalizeAnswer(submitted)
  const answers = resolveLocalizedList(payload.answers, locale)
  return answers.some((a) => normalizeAnswer(a) === normalized)
}

export function activityPayloadForTeam(payload: ActivityPayload): TeamActivityPayload {
  if (payload.type === 'quiz') return quizPayloadForTeam(payload)
  return payload
}

export function parseQuizActivityPayload(raw: unknown): QuizActivityPayload {
  const value = raw as Record<string, unknown>
  const question = value.question
  const answers = parseLocalizedStringList(value.answers)
  const payload: QuizActivityPayload = {
    type: 'quiz',
    question:
      typeof question === 'string'
        ? { de: question, en: question }
        : {
            de: typeof (question as { de?: string })?.de === 'string' ? (question as { de: string }).de : '',
            en: typeof (question as { en?: string })?.en === 'string' ? (question as { en: string }).en : '',
          },
    answers,
  }
  if (value.inputMode === 'freeText' || value.inputMode === 'multipleChoice') {
    payload.inputMode = value.inputMode
  }
  if (value.choices !== undefined) {
    payload.choices = parseLocalizedStringList(value.choices)
  }
  return payload
}

export function parsePerformanceActivityPayload(raw: unknown): PerformanceActivityPayload {
  const value = raw as Record<string, unknown>
  const text = value.text
  return {
    type: 'performance',
    text:
      typeof text === 'string'
        ? { de: text, en: text }
        : {
            de: typeof (text as { de?: string })?.de === 'string' ? (text as { de: string }).de : '',
            en: typeof (text as { en?: string })?.en === 'string' ? (text as { en: string }).en : '',
          },
  }
}

export function parseActivityPayload(raw: unknown): ActivityPayload {
  const value = raw as Record<string, unknown>
  if (value.type === 'performance') return parsePerformanceActivityPayload(raw)
  return parseQuizActivityPayload(raw)
}

export function buildQuizActivityPayload(activity: {
  type: 'quiz'
  question: QuizActivityPayload['question']
  inputMode?: QuizInputMode
  choices?: QuizActivityPayload['choices']
  answers: QuizActivityPayload['answers']
}): QuizActivityPayload {
  const payload: QuizActivityPayload = {
    type: 'quiz',
    question: activity.question,
    answers: normalizeLocalizedStringList(activity.answers),
  }
  if (activity.inputMode) payload.inputMode = activity.inputMode
  if (activity.choices) payload.choices = normalizeLocalizedStringList(activity.choices)
  return payload
}

export function buildPerformanceActivityPayload(activity: {
  type: 'performance'
  text: PerformanceActivityPayload['text']
}): PerformanceActivityPayload {
  return {
    type: 'performance',
    text: activity.text,
  }
}
