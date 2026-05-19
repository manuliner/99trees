import type { EditionConfig } from '#shared/types'
import {
  DEFAULT_EDITION_COLOR_PALETTE,
  resolveEditionColorPalette,
  type EditionColorPalette,
} from '#shared/pixel-palettes'
import { parseEditionSlug } from '#shared/edition-urls'
import type { EditionPublic } from '~/composables/useEditionId'

export function useEditionThemeOverride() {
  return useState<EditionColorPalette | null>('edition-theme-override', () => null)
}

type MeThemePayload = {
  edition?: {
    config?: Pick<EditionConfig, 'colorPalette'>
  }
}

export function useEditionTheme() {
  const route = useRoute()
  const override = useEditionThemeOverride()

  const editionSlugParam = computed(() => parseEditionSlug(route.params.edition))

  const { data: editionPublic } = useAsyncData(
    () => `edition-theme-${editionSlugParam.value ?? 'none'}`,
    async () => {
      const slug = editionSlugParam.value
      if (!slug) return null
      return $fetch<EditionPublic>(`/api/editions/by-slug/${encodeURIComponent(slug)}/public`)
    },
    { watch: [editionSlugParam] },
  )

  const needsMePalette = computed(
    () => route.path === '/play' || route.path.startsWith('/t/'),
  )

  const { data: meForTheme } = useAsyncData(
    () => `edition-theme-me-${route.path}`,
    async () => {
      if (!needsMePalette.value) return null
      try {
        return await $fetch<MeThemePayload>('/api/me', { credentials: 'include' })
      }
      catch {
        return null
      }
    },
    { watch: [needsMePalette] },
  )

  const crewSessionPalette = ref<EditionColorPalette | null>(null)

  const needsCrewSessionPalette = computed(
    () => route.path.startsWith('/crew') && editionSlugParam.value == null,
  )

  watch(
    needsCrewSessionPalette,
    async (needs) => {
      if (!needs) {
        crewSessionPalette.value = null
        return
      }
      try {
        const res = await $fetch<{ colorPalette?: EditionColorPalette }>('/api/crew/session', {
          credentials: 'include',
        })
        crewSessionPalette.value = resolveEditionColorPalette(res.colorPalette)
      }
      catch {
        crewSessionPalette.value = null
      }
    },
    { immediate: true },
  )

  const activePalette = computed(() => {
    if (override.value) return override.value
    const fromMe = meForTheme.value?.edition?.config?.colorPalette
    if (fromMe) return resolveEditionColorPalette(fromMe)
    const fromPublic = editionPublic.value?.colorPalette
    if (fromPublic) return resolveEditionColorPalette(fromPublic)
    if (crewSessionPalette.value) return crewSessionPalette.value
    return DEFAULT_EDITION_COLOR_PALETTE
  })

  useHead(computed(() => ({
    htmlAttrs: {
      'data-pixel-palette': activePalette.value,
    },
  })))

  return {
    activePalette,
    override,
  }
}
