<script setup lang="ts">
import {
  TEAM_AVATAR_IDS,
  TEAM_AVATAR_PLACEHOLDER,
  teamAvatarFallbackLabel,
  teamAvatarImagePath,
  type TeamAvatarId,
} from '#shared/team-avatars'

const model = defineModel<TeamAvatarId | null>({ required: true })

const { t, te } = useI18n()

function avatarLabel(id: TeamAvatarId): string {
  const key = `onboarding.avatars.${id}`
  return te(key) ? t(key) : teamAvatarFallbackLabel(id)
}
</script>

<template>
  <div
    class="team-avatar-picker max-h-[min(60vh,28rem)] overflow-y-auto pr-1"
    role="radiogroup"
    :aria-label="t('onboarding.avatarGroupAria')"
  >
    <div class="grid grid-cols-3 gap-3">
      <button
        v-for="id in TEAM_AVATAR_IDS"
        :key="id"
        type="button"
        role="radio"
        class="team-avatar-picker__tile pixel-card flex flex-col items-center gap-2 p-3 transition-transform"
        :class="{ 'team-avatar-picker__tile--selected': model === id }"
        :aria-checked="model === id"
        @click="model = id"
      >
        <span
          class="team-avatar-picker__badge flex h-14 w-14 items-center justify-center overflow-hidden"
          :style="{ backgroundColor: TEAM_AVATAR_PLACEHOLDER[id].color }"
        >
          <img
            :src="teamAvatarImagePath(id)"
            :alt="avatarLabel(id)"
            class="h-full w-full object-contain"
          >
        </span>
        <span class="pixel-body text-center text-[10px] leading-tight">
          {{ avatarLabel(id) }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.team-avatar-picker__tile {
  border: 2px solid transparent;
  cursor: pointer;
}

.team-avatar-picker__tile--selected {
  border-color: var(--sunrise);
  box-shadow: 0 0 0 1px var(--sunrise);
}

.team-avatar-picker__tile:focus-visible {
  outline: 2px solid var(--sunrise);
  outline-offset: 2px;
}

.team-avatar-picker__badge {
  border: 2px solid var(--pixel-border);
  image-rendering: pixelated;
}

.team-avatar-picker__badge img {
  image-rendering: pixelated;
}
</style>
