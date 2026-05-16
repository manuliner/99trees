<script setup lang="ts">
const route = useRoute()
const editionId = computed(() => Number(route.query.edition) || 1)
const tab = ref<'migration' | 'highscore'>('highscore')

const { data, refresh } = await useFetch(() => `/api/leaderboard?editionId=${editionId.value}`, {
  credentials: 'include',
})

const me = ref<{ team?: { id: number; positionConfirmed: number } } | null>(null)
onMounted(async () => {
  try {
    me.value = await $fetch('/api/me', { credentials: 'include' })
  }
  catch {
    me.value = null
  }
})

const migrationSorted = computed(() => {
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
onMounted(() => {
  poll = setInterval(() => refresh(), 8_000)
})
onUnmounted(() => {
  if (poll) clearInterval(poll)
})
</script>

<template>
  <main class="p-4 max-w-md mx-auto space-y-4">
    <h1 class="pixel-title text-center text-base">Leaderboard</h1>

    <p v-if="data?.edition?.status === 'draft'" class="pixel-card p-4 pixel-body text-sm text-center">
      The migration begins soon — check back when the game is live.
    </p>

    <p v-else-if="data?.edition?.status === 'paused'" class="pixel-card p-4 pixel-body text-sm text-center">
      Game paused — standings are frozen.
    </p>

    <template v-else>
      <p v-if="data?.edition" class="pixel-body text-sm text-center opacity-80">
        {{ data.edition.name }} · {{ data.officialRanking ? 'Official ranking' : 'Live' }}
      </p>

      <p v-if="winnerName" class="pixel-card p-3 pixel-title text-xs text-center text-[var(--pixel-gold)]">
        Winner: {{ winnerName }}
      </p>
      <p v-if="data?.fallbackRanking" class="pixel-body text-xs text-center opacity-70">
        No team reached the goal — ranking by highest field, then points.
      </p>

      <BirdBoard
        v-if="data?.edition"
        :field-count="data.edition.fieldCount"
        :position-confirmed="me?.team?.positionConfirmed ?? 0"
        class="opacity-90"
      />

      <div class="flex gap-2">
        <PixelButton :variant="tab === 'migration' ? 'primary' : 'secondary'" class="!text-[10px]" @click="tab = 'migration'">
          Migration
        </PixelButton>
        <PixelButton :variant="tab === 'highscore' ? 'primary' : 'secondary'" class="!text-[10px]" @click="tab = 'highscore'">
          Highscore
        </PixelButton>
      </div>

      <ol v-if="tab === 'migration'" class="space-y-2">
        <li
          v-for="(t, i) in migrationSorted"
          :key="t.id"
          class="pixel-card p-3 flex justify-between items-center gap-2"
          :class="{ 'ring-2 ring-[var(--sunrise)]': me?.team?.id === t.id }"
        >
          <span class="pixel-title text-xs w-6">{{ i + 1 }}</span>
          <span class="pixel-body text-sm flex-1 truncate">
            {{ t.name }}
            <span v-if="me?.team?.id === t.id" class="text-[10px] opacity-70"> (you)</span>
          </span>
          <span class="pixel-body text-xs">Field {{ t.position }}</span>
        </li>
      </ol>

      <ol v-else class="space-y-2">
        <li
          v-for="(t, i) in highscoreSorted"
          :key="t.id"
          class="pixel-card p-3 flex justify-between items-center gap-2"
          :class="{
            'opacity-60': !t.reachedGoal && !data?.officialRanking,
            'ring-2 ring-[var(--sunrise)]': me?.team?.id === t.id,
          }"
        >
          <span class="pixel-title text-xs w-6">{{ i + 1 }}</span>
          <span class="pixel-body text-sm flex-1 truncate">
            {{ t.name }}
            <span v-if="me?.team?.id === t.id" class="text-[10px] opacity-70"> (you)</span>
          </span>
          <span class="pixel-body text-xs text-right">
            {{ t.scoreTotal }} pts
            <span v-if="t.reachedGoal" class="text-[var(--pixel-gold)]"> ★</span>
            <span v-else-if="!data?.officialRanking" class="block text-[10px]">en route</span>
          </span>
        </li>
      </ol>
    </template>

    <NuxtLink to="/play" class="pixel-body text-sm underline block text-center">Back to game</NuxtLink>
  </main>
</template>
