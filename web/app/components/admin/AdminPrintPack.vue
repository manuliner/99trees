<script setup lang="ts">
const props = defineProps<{
  joinUrl: string
  crewLoginUrl: string
  ready: boolean
}>()

const emit = defineEmits<{ exportQr: []; copyJoin: []; copyCrewLogin: [] }>()

const copiedJoin = ref(false)
const copiedCrewLogin = ref(false)

async function copyToClipboard(text: string, which: 'join' | 'crew') {
  if (!text) return
  await navigator.clipboard.writeText(text)
  if (which === 'join') {
    copiedJoin.value = true
    emit('copyJoin')
    setTimeout(() => {
      copiedJoin.value = false
    }, 2000)
  } else {
    copiedCrewLogin.value = true
    emit('copyCrewLogin')
    setTimeout(() => {
      copiedCrewLogin.value = false
    }, 2000)
  }
}
</script>

<template>
  <div class="space-y-3 admin-print-pack">
    <p v-if="!ready" class="admin-body text-xs text-[var(--pixel-sunrise)]">
      Complete setup steps above before printing — URLs may change.
    </p>
    <p class="admin-body text-xs opacity-80">
      Print station QRs after import. Print one entry QR at the festival gate.
      Share the crew login URL with staff (not on printed QRs).
    </p>

    <div class="space-y-1">
      <p class="admin-body text-xs font-medium">Entry / join URL</p>
      <p class="admin-body text-xs break-all">{{ joinUrl || 'Set a valid slug first' }}</p>
      <PixelButton
        variant="secondary"
        :disabled="!joinUrl"
        @click="copyToClipboard(joinUrl, 'join')"
      >
        {{ copiedJoin ? 'Copied!' : 'Copy join URL' }}
      </PixelButton>
    </div>

    <div class="space-y-1">
      <p class="admin-body text-xs font-medium">Crew login URL</p>
      <p class="admin-body text-xs break-all">{{ crewLoginUrl || 'Set a valid slug first' }}</p>
      <PixelButton
        variant="secondary"
        :disabled="!crewLoginUrl"
        @click="copyToClipboard(crewLoginUrl, 'crew')"
      >
        {{ copiedCrewLogin ? 'Copied!' : 'Copy crew login URL' }}
      </PixelButton>
    </div>

    <div class="flex flex-wrap gap-2 pt-1">
      <PixelButton variant="secondary" @click="emit('exportQr')">Download station QR HTML</PixelButton>
    </div>
  </div>
</template>
