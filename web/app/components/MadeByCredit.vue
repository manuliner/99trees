<template>
  <div
    class="made-by-credit"
    role="contentinfo"
    :aria-label="$t('credit.aria')"
  >
    <p class="made-by-credit__line">
      {{ $t('credit.madeBy') }} - {{ $t('credit.madeWith') }}
    </p>
  </div>
</template>

<style scoped>
.made-by-credit {
  display: flex;
  justify-content: center;
  text-align: center;
}

.made-by-credit__line {
  margin: 0;
  font-family: system-ui, sans-serif;
  font-size: 11px;
  line-height: 1.35;
  color: var(--pixel-forest-dark);
  opacity: 0.65;
}
</style>
