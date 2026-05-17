export type PixelConfirmOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: 'primary' | 'danger'
}

type ConfirmState = PixelConfirmOptions & { open: boolean }

const confirmState = ref<ConfirmState>({
  open: false,
  message: '',
})

let resolveFn: ((value: boolean) => void) | null = null

function settle(ok: boolean) {
  confirmState.value = { open: false, message: '' }
  const resolve = resolveFn
  resolveFn = null
  resolve?.(ok)
}

export function usePixelConfirm() {
  function confirm(options: PixelConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      resolveFn = resolve
      confirmState.value = {
        open: true,
        message: options.message,
        title: options.title,
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
        confirmVariant: options.confirmVariant,
      }
    })
  }

  function onConfirm() {
    settle(true)
  }

  function onCancel() {
    settle(false)
  }

  return { confirmState, confirm, onConfirm, onCancel }
}
