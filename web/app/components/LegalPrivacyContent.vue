<template>
  <div class="legal-content pixel-body text-sm space-y-4">
    <p>{{ $t('privacy.intro') }}</p>

    <section class="space-y-2">
      <h2 class="legal-content__heading">{{ $t('privacy.controllerHeading') }}</h2>
      <p class="whitespace-pre-line">{{ $t('privacy.controllerBody') }}</p>
    </section>

    <section class="space-y-2">
      <h2 class="legal-content__heading">{{ $t('privacy.purposeHeading') }}</h2>
      <p>{{ $t('privacy.purposeBody') }}</p>
    </section>

    <section class="space-y-2">
      <h2 class="legal-content__heading">{{ $t('privacy.dataHeading') }}</h2>
      <ul class="legal-content__list space-y-2 list-disc ps-5">
        <li>{{ $t('privacy.dataTeam') }}</li>
        <li>{{ $t('privacy.dataGame') }}</li>
        <li>{{ $t('privacy.dataAuth') }}</li>
        <li>{{ $t('privacy.dataMedia') }}</li>
        <li>{{ $t('privacy.dataTech') }}</li>
      </ul>
    </section>

    <section class="space-y-2">
      <h2 class="legal-content__heading">{{ $t('privacy.publicHeading') }}</h2>
      <p>{{ $t('privacy.publicBody') }}</p>
    </section>

    <section class="space-y-2">
      <h2 class="legal-content__heading">{{ $t('privacy.cameraHeading') }}</h2>
      <p>{{ $t('privacy.cameraBody') }}</p>
    </section>

    <section class="space-y-2">
      <h2 class="legal-content__heading">{{ $t('privacy.cookiesHeading') }}</h2>
      <p>{{ $t('privacy.cookiesBody') }}</p>
    </section>

    <section class="space-y-2">
      <h2 class="legal-content__heading">{{ $t('privacy.legalBasisHeading') }}</h2>
      <p>{{ $t('privacy.legalBasisBody') }}</p>
    </section>

    <section class="space-y-2">
      <h2 class="legal-content__heading">{{ $t('privacy.retentionHeading') }}</h2>
      <p>{{ $t('privacy.retentionBody') }}</p>
    </section>

    <section class="space-y-2">
      <h2 class="legal-content__heading">{{ $t('privacy.recipientsHeading') }}</h2>
      <p>{{ $t('privacy.recipientsBody') }}</p>
    </section>

    <section class="space-y-2">
      <h2 class="legal-content__heading">{{ $t('privacy.rightsHeading') }}</h2>
      <p>{{ $t('privacy.rightsBody') }}</p>
    </section>

    <section class="space-y-2">
      <h2 class="legal-content__heading">{{ $t('privacy.complaintHeading') }}</h2>
      <p>{{ $t('privacy.complaintBody') }}</p>
    </section>

    <section class="space-y-2">
      <h2 class="legal-content__heading">{{ $t('privacy.externalHeading') }}</h2>
      <p>
        {{ $t('privacy.externalBody') }}
        <a
          class="legal-content__link"
          href="https://zugvoegelfestival.org/imp/"
          target="_blank"
          rel="noopener noreferrer"
        >zugvoegelfestival.org/imp/</a>
      </p>
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

.legal-content__list {
  margin: 0;
}
</style>
