import { editionPath } from '#shared/edition-urls'

type TeamOnboarding = {
  editionId: number
  onboardingComplete?: boolean
}

export type MePayload = {
  team?: TeamOnboarding | null
  edition?: { slug: string } | null
} | null | undefined

/** Navigate to /play or /{slug}/onboarding based on team onboarding state. */
export function playPathForTeam(me: MePayload): string {
  const team = me?.team
  const slug = me?.edition?.slug
  if (!team) return '/'
  if (team.onboardingComplete) return '/play'
  if (slug) return editionPath(slug, '/onboarding')
  return '/play'
}

/** Redirect when session exists but onboarding is incomplete (play guard). */
export function useOnboardingPlayGuard(me: Ref<MePayload>) {
  const route = useRoute()
  watchEffect(() => {
    const team = me.value?.team
    const slug = me.value?.edition?.slug
    if (!team || team.onboardingComplete || !slug) return
    if (route.path.endsWith('/onboarding')) return
    navigateTo(editionPath(slug, '/onboarding'))
  })
}
