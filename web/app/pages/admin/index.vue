<script setup lang="ts">
import type { SetupStepId } from '~/composables/useAdminEdition'

definePageMeta({ layout: 'admin', ssr: false })

const {
  editions,
  selectedId,
  selectedEdition,
  checklist,
  error,
  success,
  joinUrl,
  crewLoginUrl,
  setupSteps,
  nextStepId,
  canGoLive,
  loading,
  loadEditions,
  createEdition,
  saveEditionSettings,
  saveCrewPassword,
  setStatus,
  stations,
  importStations,
  downloadStations,
  createStation,
  updateStation,
  uploadMap,
  exportStationQr,
  logout,
  teams,
  setTeamPin,
  approvalPending,
  approvalCount,
  approvalResolvingTurnId,
  resolveApproval,
  isStepExpanded,
  toggleStepExpanded,
} = useAdminEdition()

usePullToRefresh(loadEditions)

const teamsExpanded = ref(false)

watch(
  () => [selectedEdition.value?.teamCount, approvalCount.value] as const,
  ([teamCount, waiting]) => {
    if ((teamCount != null && teamCount > 0) || (waiting != null && waiting > 0)) {
      teamsExpanded.value = true
    }
  },
  { immediate: true },
)

async function onSetTeamPin(teamId: number, pin: string) {
  await setTeamPin(teamId, pin)
}

async function onResolveApproval(
  item: (typeof approvalPending.value)[number],
  actionId: string,
) {
  await resolveApproval(item, actionId)
}

const showNewEdition = ref(false)

onMounted(async () => {
  try {
    await loadEditions()
  }
  catch (e) {
    if ((e as { statusCode?: number }).statusCode === 401) {
      await navigateTo('/admin/login')
    }
  }
})

function stepDone(id: SetupStepId) {
  return setupSteps.value.find((s) => s.id === id)?.done ?? false
}

function onSelectEdition(id: number) {
  selectedId.value = id
}

function onShowNewEdition(open: boolean) {
  showNewEdition.value = open
}

async function onCreate(payload: { name: string; slug: string }) {
  await createEdition(payload.name, payload.slug)
  showNewEdition.value = false
}

function onDownloadStations() {
  const slug = selectedEdition.value?.slug
  if (slug) downloadStations(slug)
}

const printReady = computed(() => stepDone('print'))

const showSetup = computed(() => {
  const s = selectedEdition.value?.status
  return s === 'draft' || s === 'live'
})

const contentReady = computed(
  () => selectedEdition.value != null && checklist.value != null && !loading.value,
)
</script>

<template>
  <main class="p-4 max-w-lg mx-auto space-y-4 pb-8">
    <AdminEditionHeader
      :editions="editions"
      :selected-id="selectedId"
      :show-new-edition="showNewEdition"
      :show-game-control="contentReady"
      :approval-count="approvalCount"
      @update:selected-id="onSelectEdition"
      @update:show-new-edition="onShowNewEdition"
      @create="onCreate"
    >
      <template #actions>
        <button type="button" class="admin-body text-xs underline opacity-80" @click="logout">
          Sign out
        </button>
      </template>
      <template #game-control>
        <AdminEditionControl
          compact
          :status="selectedEdition!.status"
          :slug="selectedEdition!.slug"
          :can-go-live="canGoLive"
          :checklist="checklist!"
          @set-status="setStatus"
        />
      </template>
    </AdminEditionHeader>

    <p v-if="error" class="pixel-card p-3 admin-body text-sm text-[var(--pixel-score-minus)]">
      {{ error }}
    </p>
    <p v-if="success" class="pixel-card p-3 admin-body text-sm text-[var(--pixel-score-plus)]">
      {{ success }}
    </p>

    <p
      v-if="loading || (selectedId && !checklist && editions.length)"
      class="pixel-card p-4 admin-body text-sm text-center"
    >
      Loading…
    </p>

    <template v-else-if="contentReady">
      <p
        v-if="selectedEdition!.status === 'paused'"
        class="pixel-card p-3 admin-body text-sm text-center"
      >
        Game paused — standings are frozen.
      </p>
      <p
        v-else-if="selectedEdition!.status === 'ended'"
        class="pixel-card p-3 admin-body text-sm text-center"
      >
        Edition ended — final results are fixed.
      </p>

      <section v-if="showSetup" class="space-y-2">
        <p class="pixel-title text-xs px-1">Setup</p>

        <AdminAccordionSection
          title="Edition settings"
          :done="stepDone('edition')"
          :is-next="nextStepId === 'edition'"
          :expanded="isStepExpanded('edition')"
          @toggle="toggleStepExpanded('edition')"
        >
          <AdminEditionSettings
            :name="selectedEdition!.name"
            :slug="selectedEdition!.slug"
            :status="selectedEdition!.status"
            :config="selectedEdition!.config"
            :join-url="joinUrl"
            @save="saveEditionSettings"
          />
        </AdminAccordionSection>

        <AdminAccordionSection
          title="Stations"
          :done="stepDone('stations')"
          :is-next="nextStepId === 'stations'"
          :expanded="isStepExpanded('stations')"
          @toggle="toggleStepExpanded('stations')"
        >
          <AdminStationsSection
            :edition-slug="selectedEdition!.slug"
            :station-count="checklist!.stationCount"
            :field-count="checklist!.fieldCount"
            :stations="stations"
            @import="importStations"
            @download="onDownloadStations"
            @save-station="updateStation"
            @create-station="createStation"
          />
        </AdminAccordionSection>

        <AdminAccordionSection
          title="Festival map"
          :done="stepDone('map')"
          :is-next="nextStepId === 'map'"
          :expanded="isStepExpanded('map')"
          @toggle="toggleStepExpanded('map')"
        >
          <AdminMapUpload
            :map-image-url="selectedEdition!.mapImageUrl"
            @upload="uploadMap"
          />
        </AdminAccordionSection>

        <AdminAccordionSection
          title="Crew password"
          :done="stepDone('crew')"
          :is-next="nextStepId === 'crew'"
          :expanded="isStepExpanded('crew')"
          @toggle="toggleStepExpanded('crew')"
        >
          <AdminCrewPassword
            :has-password="checklist!.hasCrewPassword"
            @save="saveCrewPassword"
          />
        </AdminAccordionSection>
      </section>

      <section class="space-y-2">
        <p class="pixel-title text-xs px-1">Teams</p>
        <AdminAccordionSection
          title="Teams"
          :done="teams.length > 0"
          :is-next="false"
          :expanded="teamsExpanded"
          @toggle="teamsExpanded = !teamsExpanded"
        >
          <AdminTeamsSection
            :teams="teams"
            :field-count="checklist!.fieldCount"
            :edition-status="selectedEdition!.status"
            :approvals="approvalPending"
            :approval-resolving-turn-id="approvalResolvingTurnId"
            :on-set-pin="onSetTeamPin"
            :on-resolve-approval="onResolveApproval"
          />
        </AdminAccordionSection>
      </section>

      <section class="space-y-2">
        <p class="pixel-title text-xs px-1">Print &amp; distribute</p>
        <AdminAccordionSection
          title="QR codes & entry link"
          :done="stepDone('print')"
          :is-next="nextStepId === 'print'"
          :expanded="isStepExpanded('print')"
          @toggle="toggleStepExpanded('print')"
        >
          <AdminPrintPack
            :join-url="joinUrl"
            :crew-login-url="crewLoginUrl"
            :ready="printReady"
            @export-qr="exportStationQr"
          />
        </AdminAccordionSection>
      </section>

    </template>

    <p v-else-if="!editions.length && !showNewEdition" class="pixel-card p-4 admin-body text-sm text-center">
      No editions yet. Tap + to create a draft.
    </p>
  </main>
</template>
