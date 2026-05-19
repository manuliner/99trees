import type { AppLocale } from './localized'
import { normalizeLocalizedStringList, parseLocalizedStringList, resolveLocalizedList } from './localized'
import type {
  ActivityPayload,
  CoopActivityPayload,
  MediaActivityPayload,
  MediaKind,
  PerformanceActivityPayload,
  QuizActivityPayload,
  QuizInputMode,
  TeamQuizActivityPayload,
} from './types'

export type TeamActivityPayload =
  | TeamQuizActivityPayload
  | PerformanceActivityPayload
  | CoopActivityPayload
  | MediaActivityPayload

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
  if (payload.type === 'coop') return payload
  if (payload.type === 'media') return payload
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

export function parseCoopActivityPayload(raw: unknown): CoopActivityPayload {
  const value = raw as Record<string, unknown>
  const instructions = value.instructions
  const partnerInstructions = value.partnerInstructions
  const toLocalized = (field: unknown) =>
    typeof field === 'string'
      ? { de: field, en: field }
      : {
          de: typeof (field as { de?: string })?.de === 'string' ? (field as { de: string }).de : '',
          en: typeof (field as { en?: string })?.en === 'string' ? (field as { en: string }).en : '',
        }
  return {
    type: 'coop',
    instructions: toLocalized(instructions),
    partnerInstructions: toLocalized(partnerInstructions),
  }
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

function parseMediaKinds(raw: unknown): MediaKind[] {
  if (!Array.isArray(raw)) return ['photo']
  const allowed = new Set<MediaKind>(['photo', 'video', 'audio'])
  const kinds = raw.filter((k): k is MediaKind => typeof k === 'string' && allowed.has(k as MediaKind))
  return kinds.length > 0 ? kinds : ['photo']
}

export function parseMediaActivityPayload(raw: unknown): MediaActivityPayload {
  const value = raw as Record<string, unknown>
  const text = value.text
  const payload: MediaActivityPayload = {
    type: 'media',
    text:
      typeof text === 'string'
        ? { de: text, en: text }
        : {
            de: typeof (text as { de?: string })?.de === 'string' ? (text as { de: string }).de : '',
            en: typeof (text as { en?: string })?.en === 'string' ? (text as { en: string }).en : '',
          },
    allowedKinds: parseMediaKinds(value.allowedKinds),
  }
  if (typeof value.maxDurationSec === 'number' && value.maxDurationSec > 0) {
    payload.maxDurationSec = value.maxDurationSec
  }
  return payload
}

export function parseActivityPayload(raw: unknown): ActivityPayload {
  const value = raw as Record<string, unknown>
  if (value.type === 'performance') return parsePerformanceActivityPayload(raw)
  if (value.type === 'coop') return parseCoopActivityPayload(raw)
  if (value.type === 'media') return parseMediaActivityPayload(raw)
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

export function buildCoopActivityPayload(activity: {
  type: 'coop'
  instructions: CoopActivityPayload['instructions']
  partnerInstructions: CoopActivityPayload['partnerInstructions']
}): CoopActivityPayload {
  return {
    type: 'coop',
    instructions: activity.instructions,
    partnerInstructions: activity.partnerInstructions,
  }
}

export function buildMediaActivityPayload(activity: {
  type: 'media'
  text: MediaActivityPayload['text']
  allowedKinds: MediaActivityPayload['allowedKinds']
  maxDurationSec?: number
}): MediaActivityPayload {
  const payload: MediaActivityPayload = {
    type: 'media',
    text: activity.text,
    allowedKinds: activity.allowedKinds.length > 0 ? activity.allowedKinds : ['photo'],
  }
  if (activity.maxDurationSec != null && activity.maxDurationSec > 0) {
    payload.maxDurationSec = activity.maxDurationSec
  }
  return payload
}
