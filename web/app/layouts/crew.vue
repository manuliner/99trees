<template>
  <PixelPullToRefresh class="min-h-dvh flex flex-col">
    <div class="flex-1">
      <slot />
    </div>
    <AppVersionFooter />
  </PixelPullToRefresh>
</template>
