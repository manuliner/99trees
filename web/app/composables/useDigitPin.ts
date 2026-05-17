/** Ref that only accepts digits, capped at `maxLength` (default 4). Use with v-model on PIN inputs. */
export function useDigitPin(maxLength = 4) {
  const value = ref('')

  return computed({
    get: () => value.value,
    set: (next: string) => {
      value.value = next.replace(/\D/g, '').slice(0, maxLength)
    },
  })
}
