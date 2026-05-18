<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    editionId: number
    active?: boolean
  }>(),
  { active: true },
)

const { t } = useI18n()

const tab = ref<'progress' | 'highscore'>('highscore')

type LeaderboardData = {
  edition: { id: number; name: string; status: string; fieldCount: number }
  teams: { id: number; name: string; position: number; scoreTotal: number; reachedGoal: boolean }[]
  officialRanking: boolean
  fallbackRanking?: boolean
  winnerTeamId: number | null
}

const { data, refresh } = await useAsyncData(
  () => `leaderboard-panel-${props.editionId}`,
  async () =>
    $fetch<LeaderboardData>(`/api/leaderboard?editionId=${props.editionId}`, { credentials: 'include' }),
  { watch: [() => props.editionId] },
)

const me = ref<{ team?: { id: number } } | null>(null)
onMounted(async () => {
  try {
    me.value = await $fetch('/api/me', { credentials: 'include' })
  }
  catch {
    me.value = null
  }
})

const progressSorted = computed(() => {
  const teams = [...(data.value?.teams ?? [])]
  return teams.sort((a, b) => b.position - a.position || b.scoreTotal - a.scoreTotal)
})

const highscoreSorted = computed(() => {
  const teams = [...(data.value?.teams ?? [])]
  if (data.value?.officialRanking) {
    return teams.filter((t) => t.reachedGoal).sort((a, b) => b.scoreTotal - a.scoreTotal)
  }
  return teams.sort((a, b) => {
    if (a.reachedGoal !== b.reachedGoal) return a.reachedGoal ? -1 : 1
    return b.scoreTotal - a.scoreTotal
  })
})

const winnerName = computed(() => {
  const id = data.value?.winnerTeamId
  if (!id) return null
  return data.value?.teams.find((t) => t.id === id)?.name ?? null
})

let poll: ReturnType<typeof setInterval> | null = null

function startPoll() {
  if (poll) return
  poll = setInterval(() => refresh(), 8_000)
}

function stopPoll() {
  if (poll) {
    clearInterval(poll)
    poll = null
  }
}

watch(
  () => props.active,
  (isActive) => {
    if (isActive) startPoll()
    else stopPoll()
  },
  { immediate: true },
)

onUnmounted(stopPoll)
</script>

<template>
  <div class="space-y-4">
    <p v-if="data?.edition?.status === 'draft'" class="pixel-card p-4 pixel-body text-sm text-center">
      {{ t('leaderboard.draft') }}
    </p>

    <p v-else-if="data?.edition?.status === 'paused'" class="pixel-card p-4 pixel-body text-sm text-center">
      {{ t('leaderboard.paused') }}
    </p>

    <template v-else>
      <p v-if="data?.edition" class="pixel-body text-sm text-center opacity-80">
        {{ data.edition.name }} · {{ data.officialRanking ? t('leaderboard.officialRanking') : t('leaderboard.live') }}
      </p>

      <p v-if="winnerName" class="pixel-card p-3 pixel-title text-xs text-center text-[var(--pixel-gold)]">
        {{ t('leaderboard.winner', { name: winnerName }) }}
      </p>
      <p v-if="data?.fallbackRanking" class="pixel-body text-xs text-center opacity-70">
        {{ t('leaderboard.fallbackRanking') }}
      </p>

      <div class="flex gap-2">
        <PixelButton :variant="tab === 'progress' ? 'primary' : 'secondary'" class="!text-[10px]" @click="tab = 'progress'">
          {{ t('leaderboard.progress') }}
        </PixelButton>
        <PixelButton :variant="tab === 'highscore' ? 'primary' : 'secondary'" class="!text-[10px]" @click="tab = 'highscore'">
          {{ t('leaderboard.highscore') }}
        </PixelButton>
      </div>

      <ol v-if="tab === 'progress'" class="space-y-2">
        <li
          v-for="(team, i) in progressSorted"
          :key="team.id"
          class="pixel-card p-3 flex justify-between items-center gap-2"
          :class="{ 'ring-2 ring-[var(--sunrise)]': me?.team?.id === team.id }"
        >
          <span class="pixel-title text-xs w-6">{{ i + 1 }}</span>
          <span class="pixel-body text-sm flex-1 truncate">
            {{ team.name }}
            <span v-if="me?.team?.id === team.id" class="text-[10px] opacity-70"> {{ t('leaderboard.youMarker') }}</span>
          </span>
          <span class="pixel-body text-xs">{{ t('leaderboard.field', { n: team.position }) }}</span>
        </li>
      </ol>

      <ol v-else class="space-y-2">
        <li
          v-for="(team, i) in highscoreSorted"
          :key="team.id"
          class="pixel-card p-3 flex justify-between items-center gap-2"
          :class="{
            'opacity-60': !team.reachedGoal && !data?.officialRanking,
            'ring-2 ring-[var(--sunrise)]': me?.team?.id === team.id,
          }"
        >
          <span class="pixel-title text-xs w-6">{{ i + 1 }}</span>
          <span class="pixel-body text-sm flex-1 truncate">
            {{ team.name }}
            <span v-if="me?.team?.id === team.id" class="text-[10px] opacity-70"> {{ t('leaderboard.youMarker') }}</span>
          </span>
          <span class="pixel-body text-xs text-right">
            {{ team.scoreTotal }} {{ t('common.pts') }}
            <span v-if="team.reachedGoal" class="text-[var(--pixel-gold)]"> ★</span>
            <span v-else-if="!data?.officialRanking" class="block text-[10px]">{{ t('leaderboard.enRoute') }}</span>
          </span>
        </li>
      </ol>
    </template>
  </div>
</template>
