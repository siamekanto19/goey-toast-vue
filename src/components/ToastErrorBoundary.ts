import { defineComponent, onErrorCaptured, ref } from 'vue'

export const ToastErrorBoundary = defineComponent({
  name: 'ToastErrorBoundary',
  setup(_, { slots }) {
    const hasError = ref(false)

    onErrorCaptured((error, _instance, info) => {
      hasError.value = true
      if (process.env.NODE_ENV !== 'production') {
        console.error('[GoeyToast] Rendering error:', error, info)
      }
      return false
    })

    return () => {
      if (hasError.value) return null
      return slots.default ? slots.default() : null
    }
  },
})
