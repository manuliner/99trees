export function useScoreFeedback() {
  const flash = ref({ visible: false, delta: 0 })
  let timer: ReturnType<typeof setTimeout> | null = null

  function show(delta: number) {
    flash.value = { visible: true, delta }
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      flash.value.visible = false
    }, 900)
  }

  return { flash, show }
}
