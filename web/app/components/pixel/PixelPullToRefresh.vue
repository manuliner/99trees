<template>
  <ClientOnly>
    <PixelPullToRefreshClient v-bind="$attrs">
      <slot />
    </PixelPullToRefreshClient>
    <template #fallback>
      <!-- Do not render slot on server — page content in fallback causes hydration mismatches. -->
      <div v-bind="$attrs" aria-hidden="true" />
    </template>
  </ClientOnly>
</template>
