<script setup lang="ts">
import {
  TEAM_AVATAR_PLACEHOLDER,
  isTeamAvatarId,
  teamAvatarImagePath,
  type TeamAvatarId,
} from '#shared/team-avatars'

const props = withDefaults(
  defineProps<{
    avatarId?: string | null
    size?: 'xs' | 'sm' | 'md' | 'board' | 'board-compact' | 'board-mini'
    borderless?: boolean
  }>(),
  { avatarId: null, size: 'sm', borderless: false },
)

const validId = computed(() =>
  props.avatarId && isTeamAvatarId(props.avatarId) ? (props.avatarId as TeamAvatarId) : null,
)

const placeholder = computed(() =>
  validId.value ? TEAM_AVATAR_PLACEHOLDER[validId.value] : null,
)

const imgFailed = ref(false)

watch(() => props.avatarId, () => {
  imgFailed.value = false
})
</script>

<template>
  <span
    v-if="validId && placeholder"
    class="team-avatar-badge inline-flex shrink-0 items-center justify-center overflow-hidden"
    :class="[
      !borderless && 'border-2 border-[var(--pixel-border)]',
      size === 'md'
        ? 'h-10 w-10'
        : size === 'xs'
          ? 'h-5 w-5'
          : size === 'board'
            ? 'h-[2.75rem] w-[2.75rem]'
            : size === 'board-compact'
              ? 'h-[2.25rem] w-[2.25rem]'
              : size === 'board-mini'
                ? 'h-[0.9rem] w-[0.9rem]'
                : 'h-7 w-7',
    ]"
    aria-hidden="true"
  >
    <img
      v-if="!imgFailed"
      :src="teamAvatarImagePath(validId)"
      :alt="''"
      class="h-full w-full object-contain"
      @error="imgFailed = true"
    >
    <span
      v-else
      class="flex h-full w-full items-center justify-center"
      :class="size === 'board-mini' ? 'text-[10px]' : 'text-base'"
      :style="{ backgroundColor: placeholder.color }"
    >
      {{ placeholder.emoji }}
    </span>
  </span>
</template>

<style scoped>
.team-avatar-badge {
  image-rendering: pixelated;
}

.team-avatar-badge img {
  image-rendering: pixelated;
}
</style>
