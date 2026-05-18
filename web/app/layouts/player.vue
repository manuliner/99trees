<template>
  <PixelPullToRefresh class="min-h-dvh flex flex-col">
    <header class="player-layout-bar">
      <PlayerLanguageSwitcher />
    </header>
    <div class="flex-1 player-layout-content">
      <slot />
    </div>
    <AppVersionFooter />
  </PixelPullToRefresh>
</template>

<style scoped>
.player-layout-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  justify-content: flex-end;
  padding: calc(env(safe-area-inset-top, 0px) + 0.5rem) 0.75rem 0.25rem;
  pointer-events: none;
}

.player-layout-bar :deep(.player-lang-switcher) {
  pointer-events: auto;
}

.player-layout-content {
  margin-top: -2.25rem;
}
</style>
