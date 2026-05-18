<script setup lang="ts">
import type { AdminTeamListItem, EditionStatus, PendingApproval, TurnState } from '#shared/types'

const props = defineProps<{
  teams: AdminTeamListItem[]
  fieldCount: number
  editionStatus: EditionStatus
  approvals: PendingApproval[]
  approvalResolvingTurnId: number | null
  onSetPin: (teamId: number, pin: string) => Promise<void>
  onResolveApproval: (item: PendingApproval, actionId: string) => Promise<void>
}>()

const approvalReadOnly = computed(() => props.editionStatus === 'ended')

const teamIdsAwaitingApproval = computed(
  () => new Set(props.approvals.map((a) => a.teamId)),
)

const { confirm: pixelConfirm } = usePixelConfirm()

const search = ref('')
const expandedIds = ref<Set<number>>(new Set())
const pinByTeam = ref<Record<number, string>>({})
const savingTeamId = ref<number | null>(null)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return props.teams
  return props.teams.filter((t) => t.name.toLowerCase().includes(q))
})

function displayPosition(team: AdminTeamListItem): number {
  if (team.positionPending != null && team.openTurnState) {
    return team.positionPending
  }
  return team.positionConfirmed
}

function toggleExpanded(teamId: number) {
  const next = new Set(expandedIds.value)
  if (next.has(teamId)) next.delete(teamId)
  else next.add(teamId)
  expandedIds.value = next
}

function openTurnLabel(state: TurnState | null): string | null {
  if (!state) return null
  if (state === 'awaiting_crew') return 'Needs approval'
  if (state === 'rolled') return 'Rolled'
  if (state === 'scanned') return 'Scanned'
  return state
}

function updatePin(teamId: number, value: string) {
  pinByTeam.value = {
    ...pinByTeam.value,
    [teamId]: value.replace(/\D/g, '').slice(0, 4),
  }
}

async function savePin(team: AdminTeamListItem) {
  const pin = pinByTeam.value[team.id] ?? ''
  if (pin.length !== 4) return

  const ok = await pixelConfirm({
    title: 'Set team PIN',
    message: `Set a new 4-digit PIN for “${team.name}”?`,
    confirmLabel: 'Set PIN',
  })
  if (!ok) return

  savingTeamId.value = team.id
  try {
    await props.onSetPin(team.id, pin)
    const next = { ...pinByTeam.value }
    delete next[team.id]
    pinByTeam.value = next
  }
  finally {
    savingTeamId.value = null
  }
}
</script>

<template>
  <div id="teams-section" class="space-y-3">
    <StaffApprovalList
      :items="approvals"
      :read-only="approvalReadOnly"
      :resolving-turn-id="approvalResolvingTurnId"
      body-class="admin-body"
      @resolve="onResolveApproval"
    />

    <p
      v-if="approvals.length && teams.length"
      class="admin-body text-xs opacity-70 text-center"
    >
      All teams
    </p>

    <div class="space-y-2">
      <input
        v-model="search"
        type="search"
        placeholder="Search teams…"
        class="pixel-input w-full p-2 admin-body"
        autocomplete="off"
      >
      <p class="admin-body text-xs opacity-80">
        {{ filtered.length }} / {{ teams.length }} teams
      </p>
    </div>

    <p v-if="teams.length === 0" class="admin-body text-sm opacity-80">
      No teams registered yet.
    </p>

    <div
      v-else
      class="admin-teams-list space-y-2 max-h-[min(24rem,50vh)] overflow-y-auto pr-1"
    >
      <div
        v-for="team in filtered"
        :key="team.id"
        class="pixel-card p-3 space-y-2"
      >
        <button
          type="button"
          class="w-full flex items-start justify-between gap-2 text-left"
          :aria-expanded="expandedIds.has(team.id)"
          @click="toggleExpanded(team.id)"
        >
          <div class="min-w-0 flex-1 space-y-1">
            <p class="admin-body text-sm font-medium truncate">{{ team.name }}</p>
            <p class="admin-body text-xs opacity-80">
              Field {{ displayPosition(team) }} / {{ fieldCount }}
              · {{ team.scoreTotal }} pts
            </p>
          </div>
          <span
            v-if="teamIdsAwaitingApproval.has(team.id) || openTurnLabel(team.openTurnState)"
            class="shrink-0 px-1.5 py-0.5 text-[10px] uppercase border-2 border-[var(--pixel-forest-dark)] bg-[var(--pixel-sunrise)] admin-body"
          >
            {{ teamIdsAwaitingApproval.has(team.id) ? 'Needs approval' : openTurnLabel(team.openTurnState) }}
          </span>
        </button>

        <div
          v-show="expandedIds.has(team.id)"
          class="space-y-3 pt-2 border-t-2 border-[var(--pixel-forest-dark)]/30"
        >
          <dl class="admin-body text-xs space-y-1">
            <div class="flex justify-between gap-2">
              <dt class="opacity-70">Confirmed field</dt>
              <dd>{{ team.positionConfirmed }}</dd>
            </div>
            <div v-if="team.positionPending != null" class="flex justify-between gap-2">
              <dt class="opacity-70">Pending field</dt>
              <dd>{{ team.positionPending }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="opacity-70">Completed fields</dt>
              <dd>{{ team.completedCount }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="opacity-70">Goal reached</dt>
              <dd>{{ team.reachedGoal ? 'Yes' : 'No' }}</dd>
            </div>
            <div v-if="team.openTurnField != null" class="flex justify-between gap-2">
              <dt class="opacity-70">Open turn station</dt>
              <dd>Field {{ team.openTurnField }}</dd>
            </div>
          </dl>

          <div class="admin-teams-pin space-y-2" @click.stop>
            <label class="block space-y-1">
              <span class="admin-body text-xs block">Set PIN (4 digits)</span>
              <input
                :value="pinByTeam[team.id] ?? ''"
                type="password"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="4"
                placeholder="••••"
                class="pixel-input w-full p-2 admin-body tracking-widest"
                autocomplete="new-password"
                @input="updatePin(team.id, ($event.target as HTMLInputElement).value)"
              >
            </label>
            <PixelButton
              variant="secondary"
              :disabled="(pinByTeam[team.id] ?? '').length !== 4 || savingTeamId === team.id"
              @click="savePin(team)"
            >
              Save PIN
            </PixelButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
