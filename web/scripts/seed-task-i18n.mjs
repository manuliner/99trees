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

function buildActivityPayload(activityRaw, taskItem) {
  if (activityRaw.type === 'performance') {
    return {
      type: 'performance',
      text: normalizeLocalizedString(activityRaw.text ?? ''),
    }
  }

  if (activityRaw.type === 'coop') {
    return {
      type: 'coop',
      instructions: normalizeLocalizedString(activityRaw.instructions ?? ''),
      partnerInstructions: normalizeLocalizedString(activityRaw.partnerInstructions ?? ''),
    }
  }

  if (activityRaw.type === 'media') {
    const payload = {
      type: 'media',
      text: normalizeLocalizedString(activityRaw.text ?? ''),
      allowedKinds: Array.isArray(activityRaw.allowedKinds) && activityRaw.allowedKinds.length > 0
        ? activityRaw.allowedKinds
        : ['photo'],
    }
    const maxDurationSec =
      typeof activityRaw.maxDurationSec === 'number' && activityRaw.maxDurationSec > 0
        ? activityRaw.maxDurationSec
        : typeof taskItem?.maxDurationSec === 'number' && taskItem.maxDurationSec > 0
          ? taskItem.maxDurationSec
          : null
    if (maxDurationSec != null) {
      payload.maxDurationSec = maxDurationSec
    }
    return payload
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
