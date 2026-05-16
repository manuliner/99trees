<template>
  <footer
    class="app-version-footer shrink-0 border-t border-[var(--pixel-forest-dark)]/30 px-4 py-2 text-center"
    aria-label="Application version"
  >
    <span class="pixel-body text-xs opacity-60 tabular-nums" title="Application version">v{{ appVersion }}</span>
  </footer>
</template>

<script setup lang="ts">
const {
  public: { appVersion },
} = useRuntimeConfig()
</script>
