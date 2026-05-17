<script setup lang="ts">
defineProps<{
  hasPassword: boolean
}>()

const emit = defineEmits<{ save: [password: string] }>()

const password = ref('')

function onSave() {
  if (password.value.length < 4) return
  emit('save', password.value)
  password.value = ''
}
</script>

<template>
  <div class="space-y-3">
    <p class="admin-body text-xs opacity-80">
      Crew uses this password at <code class="text-[10px]">/{slug}/crew/login</code>.
      <span v-if="hasPassword" class="text-[var(--pixel-score-plus)]"> Password is set.</span>
    </p>
    <input
      v-model="password"
      type="password"
      placeholder="New crew password (min 4 chars)"
      class="pixel-input w-full p-2 admin-body"
      autocomplete="new-password"
    >
    <PixelButton variant="secondary" @click="onSave">Save crew password</PixelButton>
  </div>
</template>
