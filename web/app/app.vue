<template>
  <UApp>
    <div class="pixel-bg min-h-dvh">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
      <PixelConfirmHost />
    </div>
  </UApp>
</template>

<script setup lang="ts">
useEditionTheme()
</script>
