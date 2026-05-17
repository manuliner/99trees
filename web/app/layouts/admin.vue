<template>
  <PixelPullToRefresh class="pixel-bg admin-layout min-h-dvh">
    <slot />
  </PixelPullToRefresh>
</template>

<style scoped>
.admin-layout :deep(.admin-body) {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 0.9375rem;
  line-height: 1.45;
}
</style>
