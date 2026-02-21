import { Toaster } from 'vue-sonner'
import { defineComponent, h, onMounted, watch } from 'vue'
import type { PropType } from 'vue'
import type { GoeyPosition } from '../types'
import { setGoeyBounce, setGoeyPosition, setGoeySpring } from '../context'

export const GoeyToaster = defineComponent({
  name: 'GoeyToaster',
  props: {
    position: { type: String as PropType<GoeyPosition>, default: 'bottom-right' },
    duration: { type: Number, default: undefined },
    gap: { type: Number, default: 14 },
    offset: { type: [Number, String] as PropType<number | string>, default: '24px' },
    theme: { type: String as PropType<'light' | 'dark'>, default: 'light' },
    toastOptions: { type: Object as PropType<Record<string, unknown>>, default: undefined },
    expand: { type: Boolean, default: undefined },
    closeButton: { type: Boolean, default: undefined },
    richColors: { type: Boolean, default: undefined },
    visibleToasts: { type: Number, default: undefined },
    dir: { type: String as PropType<'ltr' | 'rtl'>, default: undefined },
    spring: { type: Boolean, default: true },
    bounce: { type: Number as PropType<number | undefined>, default: undefined },
  },
  setup(props) {
    watch(() => props.position, (position) => {
      setGoeyPosition(position)
    }, { immediate: true })

    watch(() => props.spring, (spring) => {
      setGoeySpring(spring)
    }, { immediate: true })

    watch(() => props.bounce, (bounce) => {
      setGoeyBounce(bounce)
    }, { immediate: true })

    onMounted(() => {
      if (process.env.NODE_ENV !== 'development') return

      const marker = document.createElement('div')
      marker.setAttribute('data-goey-toast-css', '')
      marker.style.position = 'absolute'
      marker.style.width = '0'
      marker.style.height = '0'
      marker.style.overflow = 'hidden'
      marker.style.pointerEvents = 'none'
      document.body.appendChild(marker)

      const value = getComputedStyle(marker).getPropertyValue('--goey-toast')
      document.body.removeChild(marker)

      if (!value) {
        console.warn(
          '[goey-toast-vue] Styles not found. Make sure to import the CSS:\n\n' +
          '  import "goey-toast-vue/styles.css";\n',
        )
      }
    })

    return () => h(Toaster as any, {
      position: props.position,
      duration: props.duration,
      gap: props.gap,
      offset: props.offset,
      theme: props.theme,
      toastOptions: { unstyled: true, ...(props.toastOptions ?? {}) },
      expand: props.expand,
      closeButton: props.closeButton,
      richColors: props.richColors,
      visibleToasts: props.visibleToasts,
      dir: props.dir,
    })
  },
})
