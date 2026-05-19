import { editionPath, parseEditionId } from '#shared/edition-urls'

type LegacyTarget = 'join' | 'rejoin' | 'onboarding' | 'leaderboard' | 'crew/login'

export async function useLegacyEditionRedirect(target: LegacyTarget) {
  const route = useRoute()
  const editionId = parseEditionId(route.query.edition)

  if (editionId != null) {
    const { slug } = await $fetch<{ slug: string }>(`/api/editions/${editionId}/slug`)
    const subpath = target === 'crew/login' ? '/crew/login' : `/${target}`
    const query = { ...route.query }
    delete query.edition
    await navigateTo({ path: editionPath(slug, subpath), query })
    return
  }

  await navigateTo('/')
}
