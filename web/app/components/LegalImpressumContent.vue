<template>
  <div class="legal-content pixel-body text-sm space-y-4">
    <section class="space-y-2">
      <h2 class="legal-content__heading">{{ $t('impressum.operatorHeading') }}</h2>
      <p class="whitespace-pre-line">
        <strong>{{ $t('impressum.operatorName') }}</strong><br>
        {{ $t('impressum.operatorAddress') }}<br>
        <a class="legal-content__link" :href="`mailto:${$t('impressum.operatorEmail')}`">
          {{ $t('impressum.operatorEmail') }}
        </a>
      </p>
    </section>

    <section class="space-y-2">
      <h2 class="legal-content__heading">{{ $t('impressum.representativesHeading') }}</h2>
      <p>{{ $t('impressum.representatives') }}</p>
    </section>

    <section class="space-y-2">
      <h2 class="legal-content__heading">{{ $t('impressum.registerHeading') }}</h2>
      <p class="whitespace-pre-line">{{ $t('impressum.register') }}</p>
    </section>

    <section class="space-y-2">
      <h2 class="legal-content__heading">{{ $t('impressum.appHeading') }}</h2>
      <p>{{ $t('impressum.appBody') }}</p>
    </section>

    <section class="space-y-2">
      <h2 class="legal-content__heading">{{ $t('impressum.implementationHeading') }}</h2>
      <p>{{ $t('impressum.implementationBody') }}</p>
      <MadeByCredit class="legal-content__credit" />
    </section>

    <section class="space-y-2">
      <h2 class="legal-content__heading">{{ $t('impressum.liabilityHeading') }}</h2>
      <p>{{ $t('impressum.liabilityBody') }}</p>
    </section>
  </div>
</template>

<style scoped>
.legal-content__heading {
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  opacity: 0.85;
}

.legal-content__link {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.legal-content__credit {
  margin-top: 0.5rem;
}

.legal-content__credit :deep(.made-by-credit) {
  justify-content: flex-start;
  text-align: left;
}

.legal-content__credit :deep(.made-by-credit__line) {
  opacity: 0.75;
}
</style>
