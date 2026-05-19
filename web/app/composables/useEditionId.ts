import { editionPath, parseEditionSlug } from '#shared/edition-urls'
import type { LocalizedString } from '#shared/localized'
import type { EditionColorPalette } from '#shared/pixel-palettes'

export type EditionIdSource = 'route' | 'crew'

export type EditionPublic = {
  id: number
  slug: string
  name: string
  status: string
  fieldCount: number
  joinDescription: LocalizedString | null
  joinLogoUrl: string | null
  colorPalette: EditionColorPalette
}

export function useEditionId(options?: { source?: EditionIdSource; required?: boolean }) {
  const route = useRoute()
  const source = options?.source ?? 'route'
  const required = options?.required ?? true

  const editionSlugParam = computed(() => parseEditionSlug(route.params.edition))

  const crewEditionId = ref<number | null>(null)
  const crewEditionSlug = ref<string | null>(null)
  const crewColorPalette = ref<EditionColorPalette | null>(null)
  const crewSessionLoaded = ref(false)

  if (source === 'crew') {
    onMounted(async () => {
      if (editionSlugParam.value != null) {
        crewSessionLoaded.value = true
        return
      }
      try {
        const res = await $fetch<{
          editionId: number
          editionSlug?: string
          colorPalette?: EditionColorPalette
        }>('/api/crew/session', {
          credentials: 'include',
        })
        crewEditionId.value = res.editionId
        crewEditionSlug.value = res.editionSlug ?? null
        crewColorPalette.value = res.colorPalette ?? null
      }
      catch {
        crewEditionId.value = null
        crewEditionSlug.value = null
        crewColorPalette.value = null
      }
      finally {
        crewSessionLoaded.value = true
      }
    })
  }

  const {
    data: editionPublic,
    pending: editionPublicPending,
    status: editionPublicStatus,
  } = useAsyncData(
    () => `edition-by-slug-${editionSlugParam.value ?? 'none'}`,
    async () => {
      const slug = editionSlugParam.value
      if (!slug) return undefined
      return $fetch<EditionPublic>(`/api/editions/by-slug/${encodeURIComponent(slug)}/public`)
    },
    { watch: [editionSlugParam] },
  )

  const editionSlugLookupSettled = computed(
    () => editionPublicStatus.value === 'success' || editionPublicStatus.value === 'error',
  )

  const editionId = computed(() => {
    if (editionPublic.value?.id != null) return editionPublic.value.id
    if (source === 'crew' && crewEditionId.value != null) return crewEditionId.value
    return null
  })

  const editionSlug = computed(() => {
    if (editionPublic.value?.slug) return editionPublic.value.slug
    if (editionSlugParam.value) return editionSlugParam.value
    if (source === 'crew' && crewEditionSlug.value) return crewEditionSlug.value
    return null
  })

  const editionError = computed(() => {
    if (editionSlugParam.value && !editionSlugLookupSettled.value) return null
    if (editionSlugParam.value && editionPublicStatus.value === 'error') {
      return 'Event not found.'
    }
    if (
      editionSlugParam.value
      && editionPublicStatus.value === 'success'
      && !editionPublic.value
    ) {
      return 'Event not found.'
    }
    if (source === 'crew' && !crewSessionLoaded.value && editionSlugParam.value == null) return null
    if (editionId.value != null) return null
    if (!required && source !== 'crew') return null
    if (!required && source === 'crew' && !crewSessionLoaded.value) return null
    return 'Scan the festival entry QR to open the game for your event.'
  })

  function pathWithEdition(subpath: string): string {
    const normalized = subpath.startsWith('/') ? subpath : `/${subpath}`
    const slug = editionSlug.value
    if (!slug) return normalized
    if (normalized.startsWith('/crew') && normalized !== '/crew/login') {
      return normalized
    }
    return editionPath(slug, normalized)
  }

  return {
    editionId,
    editionSlug,
    editionPublic,
    editionError,
    editionPublicPending,
    editionPublicStatus,
    editionSlugLookupSettled,
    crewEditionId,
    crewEditionSlug,
    crewColorPalette,
    crewSessionLoaded,
    pathWithEdition,
  }
}
