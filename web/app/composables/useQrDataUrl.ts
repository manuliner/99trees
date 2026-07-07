import QRCode from 'qrcode'
import type { Ref } from 'vue'

const DEFAULT_OPTS = { margin: 1, errorCorrectionLevel: 'M' as const }

export function useQrDataUrl(source: Ref<string>, size = 220) {
  const dataUrl = ref('')

  watch(
    source,
    async (value) => {
      dataUrl.value = value
        ? await QRCode.toDataURL(value, { ...DEFAULT_OPTS, width: size })
        : ''
    },
    { immediate: true },
  )

  return dataUrl
}
