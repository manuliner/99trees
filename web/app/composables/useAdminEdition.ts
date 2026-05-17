import type { AdminStationCreateInput, AdminStationPatchInput } from '#shared/schemas'
import type { AdminStation, AdminTeamListItem, EditionConfig, EditionStatus, PendingApproval } from '#shared/types'
import { adminStationsToImportDocument } from '#shared/admin-station-import'
import { cloneEditionConfig, DEFAULT_EDITION_CONFIG } from '#shared/types'
import { editionPath, isValidEditionSlug, joinPath } from '#shared/edition-urls'

export interface AdminEdition {
  id: number
  slug: string
  name: string
  status: EditionStatus
  fieldCount: number
  teamCount: number
  mapImageUrl: string | null
  config: EditionConfig
}

export interface AdminChecklist {
  ok: boolean
  issues: string[]
  stationCount: number
  fieldCount: number
  hasCrewPassword: boolean
  status: EditionStatus
}

export type SetupStepId = 'edition' | 'stations' | 'map' | 'crew' | 'print' | 'live'

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
  const stations = ref<AdminStation[]>([])
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
  const joinUrl = ref('')
  const crewLoginUrl = ref('')

  function refreshEditionUrls() {
    const slug = selectedEdition.value?.slug
    if (!slug) {
      joinUrl.value = ''
      crewLoginUrl.value = ''
      return
    }
    const origin = window.location.origin
    joinUrl.value = `${origin}${joinPath(slug)}`
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
    const stationsDone =
      c.stationCount > 0
      && c.stationCount === c.fieldCount
      && !c.issues.some((i) => i.includes('station') || i.includes('Missing station'))
    const mapDone = !!edition.mapImageUrl && !c.issues.some((i) => i.includes('map'))
    const crewDone = c.hasCrewPassword
    const printReady = editionDone && stationsDone && mapDone && crewDone
    const liveDone = c.status === 'live'

    return [
      { id: 'edition', number: 1, label: 'Edition name & URL slug', done: editionDone },
      { id: 'stations', number: 2, label: 'Stations', done: stationsDone },
      { id: 'map', number: 3, label: 'Festival map', done: mapDone },
      { id: 'crew', number: 4, label: 'Crew password', done: crewDone },
      { id: 'print', number: 5, label: 'Print QRs', done: printReady },
      { id: 'live', number: 6, label: 'Go live', done: liveDone },
    ]
  })

  const nextStepId = computed(() => setupSteps.value.find((s) => !s.done)?.id ?? null)

  const canGoLive = computed(() => checklist.value?.ok === true && selectedEdition.value?.status === 'draft')

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

  async function loadStations() {
    if (selectedId.value == null) {
      stations.value = []
      return
    }
    try {
      const res = await api<{ stations: AdminStation[] }>(
        `/api/admin/editions/${selectedId.value}/stations`,
        { credentials: 'include' },
      )
      stations.value = res.stations
    }
    catch {
      stations.value = []
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
      stations.value = []
      teams.value = []
      return
    }
    if (id === prev && checklist.value != null) return
    await refreshChecklist()
    await loadStations()
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
  }) {
    const edition = selectedEdition.value
    if (!edition) return
    const body: Record<string, unknown> = {
      name: payload.name,
      config: payload.config,
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

  async function importStations(json: string): Promise<boolean> {
    if (selectedId.value == null) return false
    setMessage()
    try {
      const parsed = JSON.parse(json)
      const res = await api<{ created: number; updated: number; fieldCount: number }>(
        `/api/admin/editions/${selectedId.value}/stations/import`,
        { method: 'POST', body: parsed, credentials: 'include' },
      )
      await loadEditions()
      await loadStations()
      await refreshChecklist()
      setMessage(
        undefined,
        `Created ${res.created}, updated ${res.updated} (${res.fieldCount} fields)`,
      )
      return true
    }
    catch (e: unknown) {
      setMessage(apiErrorMessage(e, 'Import failed'))
      return false
    }
  }

  function downloadStations(editionSlug: string) {
    const doc = adminStationsToImportDocument(stations.value)
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stations-${editionSlug}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function createStation(body: AdminStationCreateInput) {
    if (selectedId.value == null) return
    setMessage()
    try {
      await api<{ station: AdminStation }>(
        `/api/admin/editions/${selectedId.value}/stations`,
        { method: 'POST', body, credentials: 'include' },
      )
      await loadEditions()
      await loadStations()
      await refreshChecklist()
      setMessage(undefined, 'Station created')
    }
    catch (e: unknown) {
      setMessage(apiErrorMessage(e, 'Create failed'))
    }
  }

  async function updateStation(stationId: number, body: AdminStationPatchInput) {
    if (selectedId.value == null) return
    setMessage()
    try {
      await api<{ station: AdminStation }>(
        `/api/admin/editions/${selectedId.value}/stations/${stationId}`,
        { method: 'PATCH', body, credentials: 'include' },
      )
      await loadStations()
      await refreshChecklist()
      setMessage(undefined, 'Station saved')
    }
    catch (e: unknown) {
      setMessage(apiErrorMessage(e, 'Save failed'))
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

  function exportStationQr() {
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
    stations,
    loading,
    error,
    success,
    expandedSteps,
    joinUrl,
    crewLoginUrl,
    setupSteps,
    nextStepId,
    canGoLive,
    isStepExpanded,
    toggleStepExpanded,
    loadEditions,
    refreshChecklist,
    createEdition,
    saveEditionSettings,
    saveCrewPassword,
    setStatus,
    importStations,
    downloadStations,
    loadStations,
    teams,
    loadTeams,
    approvalPending,
    approvalCount,
    approvalResolvingTurnId,
    resolveApproval,
    setTeamPin,
    createStation,
    updateStation,
    uploadMap,
    exportStationQr,
    logout,
    defaultConfig,
    setMessage,
  }
}
