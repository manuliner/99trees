export function useGameApi() {
  async function api<T>(path: string, options?: Parameters<typeof $fetch<T>>[1]) {
    return $fetch<T>(path, { credentials: 'include', ...options })
  }

  return { api }
}
