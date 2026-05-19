import type { Ref } from 'vue'
import { playPathForTeam } from '~/composables/useOnboardingRedirect'

type MeTeam = { editionId: number; onboardingComplete?: boolean }

type MePayload = {
  team?: MeTeam | null
  edition?: { slug: string } | null
} | null | undefined

/** After edition slug lookup settles, redirect to play/onboarding or flag cross-edition session. */
export function useJoinSessionGate(options: {
  editionId: Ref<number | null>
  editionSlugLookupSettled: Ref<boolean>
  existingSession: Ref<MePayload>
}) {
  const sessionMismatch = ref(false)
  const sessionGateReady = ref(false)

  watch(
    () => ({
      settled: options.editionSlugLookupSettled.value,
      editionId: options.editionId.value,
      team: options.existingSession.value?.team,
    }),
    async ({ settled, editionId, team }) => {
      if (!settled || editionId == null) {
        sessionGateReady.value = false
        return
      }
      sessionGateReady.value = true
      if (!team) {
        sessionMismatch.value = false
        return
      }
      if (team.editionId === editionId) {
        await navigateTo(playPathForTeam(options.existingSession.value))
        return
      }
      sessionMismatch.value = true
    },
    { immediate: true },
  )

  return { sessionMismatch, sessionGateReady }
}
