function normalizeLocalizedString(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return { de: trimmed, en: trimmed }
  }
  return {
    de: String(value?.de ?? '').trim(),
    en: String(value?.en ?? '').trim(),
  }
}

function normalizeLocalizedStringList(value) {
  if (Array.isArray(value)) {
    const trimmed = value.map((item) => String(item).trim()).filter(Boolean)
    return { de: trimmed, en: trimmed }
  }
  return {
    de: Array.isArray(value?.de) ? value.de.map((item) => String(item).trim()).filter(Boolean) : [],
    en: Array.isArray(value?.en) ? value.en.map((item) => String(item).trim()).filter(Boolean) : [],
  }
}

function serializeLocalizedString(value) {
  return JSON.stringify(normalizeLocalizedString(value))
}

function buildActivityPayload(activityRaw) {
  if (activityRaw.type === 'performance') {
    return {
      type: 'performance',
      text: normalizeLocalizedString(activityRaw.text ?? ''),
    }
  }

  const payload = {
    type: 'quiz',
    question: normalizeLocalizedString(activityRaw.question ?? ''),
    answers: normalizeLocalizedStringList(activityRaw.answers ?? []),
  }
  if (activityRaw.inputMode) payload.inputMode = activityRaw.inputMode
  if (activityRaw.choices !== undefined) {
    payload.choices = normalizeLocalizedStringList(activityRaw.choices)
  }
  return payload
}

function resolveHintLevels(item) {
  const vague = normalizeLocalizedString(item.hint_vague)
  const level1 = item.hint_level_1 ? normalizeLocalizedString(item.hint_level_1) : vague
  const level2 = item.hint_level_2
    ? normalizeLocalizedString(item.hint_level_2)
    : item.hint_level_1
      ? normalizeLocalizedString(item.hint_level_1)
      : vague
  return { hintVague: vague, hintLevel1: level1, hintLevel2: level2 }
}

export {
  buildActivityPayload,
  normalizeLocalizedString,
  normalizeLocalizedStringList,
  resolveHintLevels,
  serializeLocalizedString,
}
