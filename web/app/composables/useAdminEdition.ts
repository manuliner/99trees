import type { AdminTaskCreateInput, AdminTaskPatchInput } from '#shared/schemas'
import type { AdminTask, AdminTeamListItem, EditionConfig, EditionStatus, PendingApproval } from '#shared/types'
import type { LocalizedString } from '#shared/localized'
import { adminTasksToImportDocument } from '#shared/admin-task-import'
import { cloneEditionConfig, DEFAULT_EDITION_CONFIG } from '#shared/types'
import { editionLandingPath, editionPath, isValidEditionSlug } from '#shared/edition-urls'

export interface AdminEdition {
  id: number
  slug: string
  name: string
  status: EditionStatus
  fieldCount: number
  teamCount: number
  mapImageUrl: string | null
  joinLogoUrl: string | null
  joinDescription: LocalizedString
  config: EditionConfig
}

export interface AdminChecklist {
  ok: boolean
  issues: string[]
  taskCount: number
  fieldCount: number
  hasCrewPassword: boolean
  status: EditionStatus
}

export type SetupStepId = 'edition' | 'tasks' | 'map' | 'crew' | 'print' | 'live'

export interface SetupStep {
  id: SetupStepId
  number: number
  label: string
  done: boolean
}

function apiErrorMessage(e: unknown, fallback: string): string {
  const err = e as { data?: { statusMessage?: string } }
  return err.data?.statusMessage ?? (e instanceof Error ? e.message : fallback)
}

export function useAdminEdition() {
  const { api } = useGameApi()

  const editions = ref<AdminEdition[]>([])
  const selectedId = ref<number | null>(null)
  const checklist = ref<AdminChecklist | null>(null)
  const tasks = ref<AdminTask[]>([])
  const teams = ref<AdminTeamListItem[]>([])
  const {
    pending: approvalPending,
    pendingCount: approvalCount,
    resolvingTurnId: approvalResolvingTurnId,
    rate: rateApprovalRaw,
  } = useStaffApprovals(selectedId, { asAdmin: true, poll: true })
  const loading = ref(false)
  const error = ref('')
  const success = ref('')
  const expandedSteps = ref<Partial<Record<SetupStepId, boolean>>>({})

  const selectedEdition = computed(() =>
    editions.value.find((e) => e.id === selectedId.value) ?? null,
  )

  /** Full public URLs — set on client only to avoid SSR/hydration text mismatch. */
  const shareUrl = ref('')
  const crewLoginUrl = ref('')

  function refreshEditionUrls() {
    const slug = selectedEdition.value?.slug
    if (!slug) {
      shareUrl.value = ''
      crewLoginUrl.value = ''
      return
    }
    const origin = window.location.origin
    shareUrl.value = `${origin}${editionLandingPath(slug)}`
    crewLoginUrl.value = `${origin}${editionPath(slug, '/crew/login')}`
  }

  watch(() => selectedEdition.value?.slug, refreshEditionUrls)
  onMounted(refreshEditionUrls)

  const setupSteps = computed((): SetupStep[] => {
    const edition = selectedEdition.value
    const c = checklist.value
    if (!edition || !c) return []

    const editionDone =
      edition.name.length > 0 && !!edition.slug && isValidEditionSlug(edition.slug)
    const tasksDone =
      c.taskCount > 0
      && c.taskCount === c.fieldCount
      && !c.issues.some((i) => i.includes('task') || i.includes('Missing task'))
    const mapDone = !!edition.mapImageUrl && !c.issues.some((i) => i.includes('map'))
    const crewDone = c.hasCrewPassword
    const printReady = editionDone && tasksDone && mapDone && crewDone
    const liveDone = c.status === 'live'

    return [
      { id: 'edition', number: 1, label: 'Edition name & URL slug', done: editionDone },
      { id: 'tasks', number: 2, label: 'Tasks', done: tasksDone },
      { id: 'map', number: 3, label: 'Festival map', done: mapDone },
      { id: 'crew', number: 4, label: 'Crew password', done: crewDone },
      { id: 'print', number: 5, label: 'Print QRs', done: printReady },
      { id: 'live', number: 6, label: 'Go live', done: liveDone },
    ]
  })

  const nextStepId = computed(() => setupSteps.value.find((s) => !s.done)?.id ?? null)

  const canGoLive = computed(() => checklist.value?.ok === true && selectedEdition.value?.status === 'draft')

  const canEditBoardFields = computed(() => {
    const e = selectedEdition.value
    if (!e) return false
    return e.status === 'draft' || e.status === 'paused' || e.status === 'live'
  })

  function setMessage(err?: string, ok?: string) {
    error.value = err ?? ''
    success.value = ok ?? ''
  }

  async function refreshChecklist() {
    if (selectedId.value == null) {
      checklist.value = null
      return
    }
    checklist.value = await api<AdminChecklist>(
      `/api/admin/editions/${selectedId.value}/checklist`,
      { credentials: 'include' },
    )
  }

  async function loadEditions() {
    loading.value = true
    try {
      const res = await api<{ editions: AdminEdition[] }>('/api/admin/editions', {
        credentials: 'include',
      })
      editions.value = res.editions
      if (res.editions.length === 0) {
        selectedId.value = null
        checklist.value = null
      }
      else {
        if (selectedId.value == null || !res.editions.some((e) => e.id === selectedId.value)) {
          selectedId.value = res.editions[0]!.id
        }
        else {
          await refreshChecklist()
          await loadTeams()
        }
      }
    }
    catch (e) {
      if ((e as { statusCode?: number }).statusCode === 401) {
        await navigateTo('/admin/login')
      }
      throw e
    }
    finally {
      loading.value = false
    }
  }

  async function loadTasks() {
    if (selectedId.value == null) {
      tasks.value = []
      return
    }
    try {
      const res = await api<{ tasks: AdminTask[] }>(
        `/api/admin/editions/${selectedId.value}/tasks`,
        { credentials: 'include' },
      )
      tasks.value = res.tasks
    }
    catch {
      tasks.value = []
    }
  }

  async function loadTeams() {
    if (selectedId.value == null) {
      teams.value = []
      return
    }
    try {
      const res = await api<{ teams: AdminTeamListItem[] }>(
        `/api/admin/editions/${selectedId.value}/teams`,
        { credentials: 'include' },
      )
      teams.value = res.teams
    }
    catch {
      teams.value = []
    }
  }

  async function resolveApproval(item: PendingApproval, actionId: string) {
    setMessage()
    try {
      await rateApprovalRaw(item, actionId)
      await loadTeams()
      setMessage(undefined, 'Approval saved')
    }
    catch (e: unknown) {
      setMessage(apiErrorMessage(e, 'Approval failed'))
      throw e
    }
  }

  async function setTeamPin(teamId: number, pin: string) {
    setMessage()
    try {
      await api(`/api/admin/teams/${teamId}/pin`, {
        method: 'PATCH',
        body: { pin },
        credentials: 'include',
      })
      setMessage(undefined, 'Team PIN saved')
    }
    catch (e: unknown) {
      setMessage(apiErrorMessage(e, 'PIN save failed'))
      throw e
    }
  }

  watch(selectedId, async (id, prev) => {
    if (id == null) {
      expandedSteps.value = {}
      checklist.value = null
      tasks.value = []
      teams.value = []
      return
    }
    if (id === prev && checklist.value != null) return
    await refreshChecklist()
    await loadTasks()
    await loadTeams()
    const next = nextStepId.value
    expandedSteps.value = next ? { [next]: true } : {}
  })

  function isStepExpanded(id: SetupStepId) {
    return !!expandedSteps.value[id]
  }

  function toggleStepExpanded(id: SetupStepId) {
    expandedSteps.value = {
      ...expandedSteps.value,
      [id]: !expandedSteps.value[id],
    }
  }

  async function createEdition(name: string, slug?: string) {
    setMessage()
    try {
      const res = await api<{ edition: { id: number } }>('/api/admin/editions', {
        method: 'POST',
        body: { name, slug: slug?.trim() || undefined },
        credentials: 'include',
      })
      selectedId.value = res.edition.id
      await loadEditions()
      setMessage(undefined, 'Draft edition created')
    }
    catch (e: unknown) {
      setMessage(apiErrorMessage(e, 'Create failed'))
    }
  }

  async function patchEdition(body: Record<string, unknown>) {
    if (selectedId.value == null) return
    setMessage()
    try {
      await api(`/api/admin/editions/${selectedId.value}`, {
        method: 'PATCH',
        body,
        credentials: 'include',
      })
      await loadEditions()
    }
    catch (e: unknown) {
      setMessage(apiErrorMessage(e, 'Save failed'))
      throw e
    }
  }

  async function saveEditionSettings(payload: {
    name: string
    slug?: string
    config: EditionConfig
    joinDescription: LocalizedString
  }) {
    const edition = selectedEdition.value
    if (!edition) return
    const body: Record<string, unknown> = {
      name: payload.name,
      config: payload.config,
      joinDescription: payload.joinDescription,
    }
    if (edition.status === 'draft' && payload.slug) {
      body.slug = payload.slug.trim().toLowerCase()
    }
    await patchEdition(body)
    setMessage(undefined, 'Edition settings saved')
  }

  async function saveCrewPassword(password: string) {
    await patchEdition({ crewPassword: password })
    setMessage(undefined, 'Crew password saved')
  }

  async function setStatus(status: EditionStatus) {
    await patchEdition({ status })
    setMessage(undefined, `Edition is now ${status}`)
  }

  async function importTasks(json: string, overwrite = false): Promise<boolean> {
    if (selectedId.value == null) return false
    setMessage()
    try {
      const parsed = JSON.parse(json) as Record<string, unknown>
      parsed.overwrite = overwrite
      const res = await api<{
        created: number
        updated: number
        deleted: number
        fieldCount: number
      }>(
        `/api/admin/editions/${selectedId.value}/tasks/import`,
        { method: 'POST', body: parsed, credentials: 'include' },
      )
      await loadEditions()
      await loadTasks()
      await refreshChecklist()
      const parts = [
        `Created ${res.created}`,
        `updated ${res.updated}`,
      ]
      if (res.deleted > 0) parts.push(`removed ${res.deleted}`)
      parts.push(`(${res.fieldCount} fields)`)
      setMessage(undefined, parts.join(', '))
      return true
    }
    catch (e: unknown) {
      setMessage(apiErrorMessage(e, 'Import failed'))
      return false
    }
  }

  function downloadTasks(editionSlug: string) {
    const doc = adminTasksToImportDocument(tasks.value)
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tasks-${editionSlug}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function addField() {
    if (selectedId.value == null) return
    setMessage()
    try {
      const res = await api<{ fieldCount: number }>(
        `/api/admin/editions/${selectedId.value}/fields/add`,
        { method: 'POST', credentials: 'include' },
      )
      await loadEditions()
      await refreshChecklist()
      setMessage(undefined, `Board now has ${res.fieldCount} fields`)
    }
    catch (e: unknown) {
      setMessage(apiErrorMessage(e, 'Add field failed'))
    }
  }

  async function removeField() {
    if (selectedId.value == null) return
    setMessage()
    try {
      const res = await api<{ fieldCount: number; deletedTask: boolean; abandonedTurns: number }>(
        `/api/admin/editions/${selectedId.value}/fields/remove`,
        { method: 'POST', credentials: 'include' },
      )
      await loadEditions()
      await loadTasks()
      await refreshChecklist()
      const parts: string[] = [`Board now has ${res.fieldCount} fields`]
      if (res.deletedTask) parts.push('task on removed field deleted')
      if (res.abandonedTurns > 0) {
        parts.push(
          `${res.abandonedTurns} open ${res.abandonedTurns === 1 ? 'turn' : 'turns'} on that field abandoned`,
        )
      }
      setMessage(undefined, parts.join(' — '))
    }
    catch (e: unknown) {
      setMessage(apiErrorMessage(e, 'Remove field failed'))
    }
  }

  async function deleteTask(taskId: number) {
    if (selectedId.value == null) return
    setMessage()
    try {
      const res = await api<{ fieldCount: number }>(
        `/api/admin/editions/${selectedId.value}/tasks/${taskId}`,
        { method: 'DELETE', credentials: 'include' },
      )
      await loadEditions()
      await loadTasks()
      await refreshChecklist()
      setMessage(undefined, `Station removed (${res.fieldCount} fields on board)`)
    }
    catch (e: unknown) {
      setMessage(apiErrorMessage(e, 'Remove station failed'))
    }
  }

  async function createTask(body: AdminTaskCreateInput) {
    if (selectedId.value == null) return
    setMessage()
    try {
      await api<{ task: AdminTask }>(
        `/api/admin/editions/${selectedId.value}/tasks`,
        { method: 'POST', body, credentials: 'include' },
      )
      await loadEditions()
      await loadTasks()
      await refreshChecklist()
      setMessage(undefined, 'Task created')
    }
    catch (e: unknown) {
      setMessage(apiErrorMessage(e, 'Create failed'))
    }
  }

  async function updateTask(taskId: number, body: AdminTaskPatchInput) {
    if (selectedId.value == null) return
    setMessage()
    try {
      await api<{ task: AdminTask }>(
        `/api/admin/editions/${selectedId.value}/tasks/${taskId}`,
        { method: 'PATCH', body, credentials: 'include' },
      )
      await loadTasks()
      await refreshChecklist()
      setMessage(undefined, 'Task saved')
    }
    catch (e: unknown) {
      setMessage(apiErrorMessage(e, 'Save failed'))
    }
  }

  async function uploadJoinLogo(file: File) {
    if (selectedId.value == null) return
    setMessage()
    const form = new FormData()
    form.append('logo', file)
    try {
      const res = await api<{ joinLogoPath: string }>(
        `/api/admin/editions/${selectedId.value}/join-logo`,
        { method: 'POST', body: form, credentials: 'include' },
      )
      await loadEditions()
      setMessage(undefined, `Join logo saved: ${res.joinLogoPath}`)
    }
    catch (e: unknown) {
      setMessage(apiErrorMessage(e, 'Logo upload failed'))
    }
  }

  async function uploadMap(file: File) {
    if (selectedId.value == null) return
    setMessage()
    const form = new FormData()
    form.append('map', file)
    try {
      const res = await api<{ mapImagePath: string }>(
        `/api/admin/editions/${selectedId.value}/map`,
        { method: 'POST', body: form, credentials: 'include' },
      )
      await loadEditions()
      setMessage(undefined, `Map saved: ${res.mapImagePath}`)
    }
    catch (e: unknown) {
      setMessage(apiErrorMessage(e, 'Map upload failed'))
    }
  }

  function exportTaskQr() {
    if (selectedId.value == null) return
    window.open(`/api/admin/editions/${selectedId.value}/qr/export`, '_blank')
  }

  async function logout() {
    await api('/api/admin/logout', { method: 'POST', credentials: 'include' })
    await navigateTo('/admin/login')
  }

  function defaultConfig(): EditionConfig {
    return cloneEditionConfig(DEFAULT_EDITION_CONFIG)
  }

  return {
    editions,
    selectedId,
    selectedEdition,
    checklist,
    tasks,
    loading,
    error,
    success,
    expandedSteps,
    shareUrl,
    crewLoginUrl,
    setupSteps,
    nextStepId,
    canGoLive,
    canEditBoardFields,
    isStepExpanded,
    toggleStepExpanded,
    loadEditions,
    refreshChecklist,
    createEdition,
    saveEditionSettings,
    saveCrewPassword,
    setStatus,
    importTasks,
    downloadTasks,
    loadTasks,
    teams,
    loadTeams,
    approvalPending,
    approvalCount,
    approvalResolvingTurnId,
    resolveApproval,
    setTeamPin,
    addField,
    removeField,
    deleteTask,
    createTask,
    updateTask,
    uploadMap,
    uploadJoinLogo,
    exportTaskQr,
    logout,
    defaultConfig,
    setMessage,
  }
}
