import { defineComponent, h, onMounted, ref, type PropType, type VNodeChild } from 'vue'
import { toast } from 'vue-sonner'
import { GoeyToast } from './components/GoeyToast'
import { ToastErrorBoundary } from './components/ToastErrorBoundary'
import type {
  GoeyPromiseData,
  GoeyToastAction,
  GoeyToastClassNames,
  GoeyToastOptions,
  GoeyToastPhase,
  GoeyToastTimings,
  GoeyToastType,
} from './types'

const DEFAULT_EXPANDED_DURATION = 4000

const GoeyToastWrapper = defineComponent({
  name: 'GoeyToastWrapper',
  props: {
    initialPhase: { type: String as PropType<GoeyToastPhase>, required: true },
    title: { type: String, required: true },
    type: { type: String as PropType<GoeyToastType>, required: true },
    description: { type: null as unknown as PropType<VNodeChild>, default: undefined },
    action: { type: Object as PropType<GoeyToastAction>, default: undefined },
    icon: { type: null as unknown as PropType<VNodeChild>, default: undefined },
    classNames: { type: Object as PropType<GoeyToastClassNames>, default: undefined },
    fillColor: { type: String, default: undefined },
    borderColor: { type: String, default: undefined },
    borderWidth: { type: Number, default: undefined },
    timing: { type: Object as PropType<GoeyToastTimings>, default: undefined },
    spring: { type: null as unknown as PropType<boolean | undefined>, default: undefined },
    bounce: { type: Number as PropType<number | undefined>, default: undefined },
    toastId: { type: [String, Number] as PropType<string | number | undefined>, default: undefined },
  },
  setup(props) {
    return () => h(ToastErrorBoundary, null, {
      default: () => [
        h(GoeyToast, {
          title: props.title,
          description: props.description,
          type: props.type,
          action: props.action,
          icon: props.icon,
          phase: props.initialPhase,
          classNames: props.classNames,
          fillColor: props.fillColor,
          borderColor: props.borderColor,
          borderWidth: props.borderWidth,
          timing: props.timing,
          spring: props.spring,
          bounce: props.bounce,
          toastId: props.toastId,
        }),
      ],
    })
  },
})

const PromiseToastWrapper = defineComponent({
  name: 'PromiseToastWrapper',
  props: {
    promise: { type: null as unknown as PropType<Promise<unknown>>, required: true },
    data: { type: Object as PropType<GoeyPromiseData<unknown>>, required: true },
    toastId: { type: [String, Number] as PropType<string | number>, required: true },
  },
  setup(props) {
    const phase = ref<GoeyToastPhase>('loading')
    const title = ref(props.data.loading)
    const description = ref<any>(props.data.description?.loading)
    const action = ref<GoeyToastAction | undefined>(undefined)

    onMounted(() => {
      const resetDuration = (hasExpandedContent: boolean) => {
        const baseDuration = props.data.timing?.displayDuration ?? (hasExpandedContent ? DEFAULT_EXPANDED_DURATION : undefined)
        const collapseDurationMs = 900
        const duration = baseDuration != null && hasExpandedContent
          ? baseDuration + collapseDurationMs
          : baseDuration

        if (duration != null) {
          ;(toast as any).custom(() => h(PromiseToastWrapper, {
            promise: props.promise,
            data: props.data,
            toastId: props.toastId,
          }), { id: props.toastId, duration })
        }
      }

      props.promise
        .then((result) => {
          const successDescription = typeof props.data.description?.success === 'function'
            ? props.data.description.success(result)
            : props.data.description?.success

          title.value = typeof props.data.success === 'function'
            ? props.data.success(result)
            : props.data.success
          description.value = successDescription
          action.value = props.data.action?.success
          phase.value = 'success'

          resetDuration(Boolean(successDescription || props.data.action?.success))
        })
        .catch((error) => {
          const errorDescription = typeof props.data.description?.error === 'function'
            ? props.data.description.error(error)
            : props.data.description?.error

          title.value = typeof props.data.error === 'function'
            ? props.data.error(error)
            : props.data.error
          description.value = errorDescription
          action.value = props.data.action?.error
          phase.value = 'error'

          resetDuration(Boolean(errorDescription || props.data.action?.error))
        })
    })

    return () => h(ToastErrorBoundary, null, {
      default: () => [
        h(GoeyToast, {
          title: title.value,
          description: description.value,
          type: phase.value === 'loading' ? 'info' : (phase.value as GoeyToastType),
          action: action.value,
          phase: phase.value,
          classNames: props.data.classNames,
          fillColor: props.data.fillColor,
          borderColor: props.data.borderColor,
          borderWidth: props.data.borderWidth,
          timing: props.data.timing,
          spring: props.data.spring,
          bounce: props.data.bounce,
        }),
      ],
    })
  },
})

function createToastId() {
  return Math.random().toString(36).slice(2)
}

function createGoeyToast(title: string, type: GoeyToastType, options?: GoeyToastOptions) {
  const hasExpandedContent = Boolean(options?.description || options?.action)
  const baseDuration = options?.timing?.displayDuration
    ?? options?.duration
    ?? (options?.description ? DEFAULT_EXPANDED_DURATION : undefined)
  const duration = hasExpandedContent ? Infinity : baseDuration

  const toastId = options?.id ?? createToastId()

  return (toast as any).custom(
    () => h(GoeyToastWrapper, {
      initialPhase: type,
      title,
      type,
      description: options?.description,
      action: options?.action,
      icon: options?.icon,
      classNames: options?.classNames,
      fillColor: options?.fillColor,
      borderColor: options?.borderColor,
      borderWidth: options?.borderWidth,
      timing: options?.timing,
      spring: options?.spring,
      bounce: options?.bounce,
      toastId: hasExpandedContent ? toastId : undefined,
    }),
    {
      duration,
      id: toastId,
    },
  )
}

type GoeyToastCallable = ((title: string, options?: GoeyToastOptions) => string | number) & {
  success: (title: string, options?: GoeyToastOptions) => string | number
  error: (title: string, options?: GoeyToastOptions) => string | number
  warning: (title: string, options?: GoeyToastOptions) => string | number
  info: (title: string, options?: GoeyToastOptions) => string | number
  promise: <T>(promise: Promise<T>, data: GoeyPromiseData<T>) => string | number
  dismiss: (toastId?: string | number) => void
}

export const goeyToast = Object.assign(
  (title: string, options?: GoeyToastOptions) => createGoeyToast(title, 'default', options),
  {
    success: (title: string, options?: GoeyToastOptions) => createGoeyToast(title, 'success', options),
    error: (title: string, options?: GoeyToastOptions) => createGoeyToast(title, 'error', options),
    warning: (title: string, options?: GoeyToastOptions) => createGoeyToast(title, 'warning', options),
    info: (title: string, options?: GoeyToastOptions) => createGoeyToast(title, 'info', options),
    promise: <T,>(promise: Promise<T>, data: GoeyPromiseData<T>) => {
      const id = createToastId()
      return (toast as any).custom(() => h(PromiseToastWrapper, {
        promise,
        data: data as GoeyPromiseData<unknown>,
        toastId: id,
      }), {
        id,
        duration: (data.timing?.displayDuration != null || data.description) ? Infinity : undefined,
      })
    },
    dismiss: (toast as any).dismiss,
  },
) as GoeyToastCallable
