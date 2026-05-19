<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import { TEAM_NAME_MAX } from '~/utils/team-form'

type TeamDirectoryEntry = {
  id: number
  name: string
  avatarId: string | null
  motto: string | null
}

const props = defineProps<{
  editionId: number
}>()

const model = defineModel<string>({ required: true })

const { t } = useI18n()
const { api } = useGameApi()

const root = ref<HTMLElement | null>(null)
const open = ref(false)
const loading = ref(false)
const teams = ref<TeamDirectoryEntry[]>([])
const loadError = ref('')

const filteredTeams = computed(() => {
  const q = model.value.trim().toLowerCase()
  if (!q) return teams.value
  return teams.value.filter((team) => team.name.toLowerCase().includes(q))
})

const showDropdown = computed(
  () => open.value && !loading.value && !loadError.value && filteredTeams.value.length > 0,
)

async function loadTeams() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await api<{ teams: TeamDirectoryEntry[] }>(
      `/api/teams/directory?editionId=${props.editionId}`,
    )
    teams.value = res.teams
  }
  catch {
    loadError.value = t('rejoin.teamSearchLoadFailed')
    teams.value = []
  }
  finally {
    loading.value = false
  }
}

function openDropdown() {
  open.value = true
  if (teams.value.length === 0 && !loading.value) {
    void loadTeams()
  }
}

function selectTeam(team: TeamDirectoryEntry) {
  model.value = team.name
  open.value = false
}

onClickOutside(root, () => {
  open.value = false
})

watch(
  () => props.editionId,
  () => {
    teams.value = []
    loadError.value = ''
    if (open.value) void loadTeams()
  },
)
</script>

<template>
  <div ref="root" class="team-directory-picker relative">
    <label class="block space-y-2">
      <span class="pixel-body text-sm">{{ t('rejoin.teamName') }}</span>
      <input
        v-model="model"
        type="search"
        class="pixel-input w-full p-3"
        :placeholder="t('rejoin.teamSearchPlaceholder')"
        autocomplete="organization"
        :maxlength="TEAM_NAME_MAX"
        required
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="showDropdown"
        aria-controls="team-directory-list"
        @focus="openDropdown"
        @input="openDropdown"
      >
    </label>

    <p v-if="loading" class="pixel-body mt-2 text-xs opacity-70">
      {{ t('rejoin.teamSearchLoading') }}
    </p>
    <p
      v-else-if="loadError"
      role="alert"
      class="mt-2 text-xs text-[var(--pixel-score-minus)]"
    >
      {{ loadError }}
    </p>
    <p
      v-else-if="open && model.trim() && filteredTeams.length === 0 && teams.length > 0"
      class="pixel-body mt-2 text-xs opacity-70"
    >
      {{ t('rejoin.teamSearchEmpty') }}
    </p>

    <ul
      v-if="showDropdown"
      id="team-directory-list"
      role="listbox"
      :aria-label="t('rejoin.teamSearchListAria')"
      class="team-directory-picker__list pixel-card absolute z-20 mt-1 max-h-[min(16rem,40vh)] w-full overflow-y-auto p-1"
    >
      <li
        v-for="team in filteredTeams"
        :key="team.id"
        role="option"
        :aria-selected="model === team.name"
        class="team-directory-picker__option flex cursor-pointer items-center gap-3 rounded p-2"
        @mousedown.prevent="selectTeam(team)"
      >
        <PixelTeamAvatarBadge :avatar-id="team.avatarId" size="md" />
        <span class="min-w-0 flex-1">
          <span class="pixel-body block truncate text-sm">{{ team.name }}</span>
          <span class="pixel-body block truncate text-xs opacity-70">
            {{ team.motto?.trim() || t('rejoin.teamMottoMissing') }}
          </span>
        </span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.team-directory-picker__option:hover,
.team-directory-picker__option:focus-visible {
  background: color-mix(in srgb, var(--pixel-forest-dark) 8%, transparent);
  outline: none;
}

.team-directory-picker__list {
  box-shadow: 0 4px 0 var(--pixel-border);
}
</style>
