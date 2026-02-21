import {
  Transition,
  computed,
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type Component,
  type CSSProperties,
  type PropType,
  type VNodeChild,
} from 'vue'
import { animate } from 'motion'
import { toast as sonnerToast } from 'vue-sonner'
import type {
  GoeyToastAction,
  GoeyToastClassNames,
  GoeyToastPhase,
  GoeyToastTimings,
  GoeyToastType,
} from '../types'
import { getGoeyBounce, getGoeyPosition, getGoeySpring } from '../context'
import { DefaultIcon, ErrorIcon, InfoIcon, SpinnerIcon, SuccessIcon, WarningIcon } from '../icons'
import { usePrefersReducedMotion } from '../usePrefersReducedMotion'
import { styles } from './goey-styles'

export interface GoeyToastProps {
  title: string
  description?: VNodeChild
  type: GoeyToastType
  action?: GoeyToastAction
  icon?: VNodeChild
  phase: GoeyToastPhase
  classNames?: GoeyToastClassNames
  fillColor?: string
  borderColor?: string
  borderWidth?: number
  timing?: GoeyToastTimings
  spring?: boolean
  bounce?: number
  toastId?: string | number
}

const phaseIconMap: Record<Exclude<GoeyToastPhase, 'loading'>, Component> = {
  default: DefaultIcon,
  success: SuccessIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  info: InfoIcon,
}

const titleColorMap: Record<GoeyToastPhase, string> = {
  loading: styles.titleLoading,
  default: styles.titleDefault,
  success: styles.titleSuccess,
  error: styles.titleError,
  warning: styles.titleWarning,
  info: styles.titleInfo,
}

const actionColorMap: Record<GoeyToastPhase, string> = {
  loading: styles.actionInfo,
  default: styles.actionDefault,
  success: styles.actionSuccess,
  error: styles.actionError,
  warning: styles.actionWarning,
  info: styles.actionInfo,
}

const PH = 34
const DEFAULT_DISPLAY_DURATION = 4000
const DEFAULT_EXPAND_DUR = 0.6
const DEFAULT_COLLAPSE_DUR = 0.9
const SMOOTH_EASE = [0.4, 0, 0.2, 1] as const

function cn(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ')
}

function squishSpring(durationSec: number, defaultDur: number, bounce = 0.4) {
  const scale = durationSec / defaultDur
  const stiffness = 200 + bounce * 437.5
  const damping = 24 - bounce * 20
  const mass = 0.7 * scale
  return { type: 'spring' as const, stiffness, damping, mass }
}

const observerRegistry = new Map<Element, {
  observer: MutationObserver
  callbacks: Set<() => void>
}>()

function registerSonnerObserver(ol: Element, callback: () => void) {
  let entry = observerRegistry.get(ol)
  if (!entry) {
    const callbacks = new Set<() => void>()
    let applying = false
    const observer = new MutationObserver(() => {
      if (applying) return
      applying = true
      requestAnimationFrame(() => {
        callbacks.forEach((cb) => cb())
        requestAnimationFrame(() => { applying = false })
      })
    })
    observer.observe(ol, {
      attributes: true,
      attributeFilter: ['style'],
      subtree: true,
      childList: true,
    })
    entry = { observer, callbacks }
    observerRegistry.set(ol, entry)
  }
  entry.callbacks.add(callback)
  return () => {
    entry?.callbacks.delete(callback)
    if (entry && entry.callbacks.size === 0) {
      entry.observer.disconnect()
      observerRegistry.delete(ol)
    }
  }
}

function syncSonnerHeights(wrapperEl: HTMLElement | null) {
  if (!wrapperEl) return
  const li = wrapperEl.closest('[data-sonner-toast]') as HTMLElement | null
  if (!li?.parentElement) return

  const ol = li.parentElement
  const toasts = Array.from(ol.querySelectorAll(':scope > [data-sonner-toast]')) as HTMLElement[]

  for (const toast of toasts) {
    const content = toast.firstElementChild as HTMLElement | null
    const height = content ? content.getBoundingClientRect().height : 0
    if (height > 0) {
      toast.style.setProperty('--initial-height', `${height}px`)
    }
  }
}

function morphPath(pw: number, bw: number, th: number, t: number): string {
  const pr = PH / 2
  const pillW = Math.min(pw, bw)
  const bodyH = PH + (th - PH) * t

  if (t <= 0 || bodyH - PH < 8) {
    return [
      `M 0,${pr}`,
      `A ${pr},${pr} 0 0 1 ${pr},0`,
      `H ${pillW - pr}`,
      `A ${pr},${pr} 0 0 1 ${pillW},${pr}`,
      `A ${pr},${pr} 0 0 1 ${pillW - pr},${PH}`,
      `H ${pr}`,
      `A ${pr},${pr} 0 0 1 0,${pr}`,
      'Z',
    ].join(' ')
  }

  const curve = 14 * t
  const cr = Math.min(16, (bodyH - PH) * 0.45)
  const bodyW = pillW + (bw - pillW) * t
  const bodyTop = PH - curve
  const qEndX = Math.min(pillW + curve, bodyW - cr)

  return [
    `M 0,${pr}`,
    `A ${pr},${pr} 0 0 1 ${pr},0`,
    `H ${pillW - pr}`,
    `A ${pr},${pr} 0 0 1 ${pillW},${pr}`,
    `L ${pillW},${bodyTop}`,
    `Q ${pillW},${bodyTop + curve} ${qEndX},${bodyTop + curve}`,
    `H ${bodyW - cr}`,
    `A ${cr},${cr} 0 0 1 ${bodyW},${bodyTop + curve + cr}`,
    `L ${bodyW},${bodyH - cr}`,
    `A ${cr},${cr} 0 0 1 ${bodyW - cr},${bodyH}`,
    `H ${cr}`,
    `A ${cr},${cr} 0 0 1 0,${bodyH - cr}`,
    'Z',
  ].join(' ')
}

function morphPathCenter(pw: number, bw: number, th: number, t: number): string {
  const pr = PH / 2
  const pillW = Math.min(pw, bw)
  const pillOffset = (bw - pillW) / 2

  if (t <= 0 || PH + (th - PH) * t - PH < 8) {
    return [
      `M ${pillOffset},${pr}`,
      `A ${pr},${pr} 0 0 1 ${pillOffset + pr},0`,
      `H ${pillOffset + pillW - pr}`,
      `A ${pr},${pr} 0 0 1 ${pillOffset + pillW},${pr}`,
      `A ${pr},${pr} 0 0 1 ${pillOffset + pillW - pr},${PH}`,
      `H ${pillOffset + pr}`,
      `A ${pr},${pr} 0 0 1 ${pillOffset},${pr}`,
      'Z',
    ].join(' ')
  }

  const bodyH = PH + (th - PH) * t
  const curve = 14 * t
  const cr = Math.min(16, (bodyH - PH) * 0.45)
  const bodyTop = PH - curve

  const bodyCenter = bw / 2
  const halfBodyW = (pillW / 2) + ((bw - pillW) / 2) * t
  const bodyLeft = bodyCenter - halfBodyW
  const bodyRight = bodyCenter + halfBodyW

  const qLeftX = Math.max(bodyLeft + cr, pillOffset - curve)
  const qRightX = Math.min(bodyRight - cr, pillOffset + pillW + curve)

  return [
    `M ${pillOffset},${pr}`,
    `A ${pr},${pr} 0 0 1 ${pillOffset + pr},0`,
    `H ${pillOffset + pillW - pr}`,
    `A ${pr},${pr} 0 0 1 ${pillOffset + pillW},${pr}`,
    `L ${pillOffset + pillW},${bodyTop}`,
    `Q ${pillOffset + pillW},${bodyTop + curve} ${qRightX},${bodyTop + curve}`,
    `H ${bodyRight - cr}`,
    `A ${cr},${cr} 0 0 1 ${bodyRight},${bodyTop + curve + cr}`,
    `L ${bodyRight},${bodyH - cr}`,
    `A ${cr},${cr} 0 0 1 ${bodyRight - cr},${bodyH}`,
    `H ${bodyLeft + cr}`,
    `A ${cr},${cr} 0 0 1 ${bodyLeft},${bodyH - cr}`,
    `L ${bodyLeft},${bodyTop + curve + cr}`,
    `A ${cr},${cr} 0 0 1 ${bodyLeft + cr},${bodyTop + curve}`,
    `H ${qLeftX}`,
    `Q ${pillOffset},${bodyTop + curve} ${pillOffset},${bodyTop}`,
    'Z',
  ].join(' ')
}

interface AnimateCtrl {
  stop: () => void
}

function runNumberAnimation(from: number, to: number, options: Record<string, unknown>) {
  return animate(from, to, options as any) as unknown as AnimateCtrl
}

function makeOpacityTransition(duration: number, prefersReducedMotion: () => boolean, delay = 0) {
  return {
    onBeforeEnter(el: Element) {
      const node = el as HTMLElement
      node.style.opacity = '0'
    },
    onEnter(el: Element, done: () => void) {
      if (prefersReducedMotion()) {
        ;(el as HTMLElement).style.opacity = '1'
        done()
        return
      }
      runNumberAnimation(0, 1, {
        duration,
        ease: SMOOTH_EASE,
        delay,
        onUpdate: (v: number) => {
          ;(el as HTMLElement).style.opacity = String(v)
        },
        onComplete: done,
      })
    },
    onLeave(el: Element, done: () => void) {
      if (prefersReducedMotion()) {
        ;(el as HTMLElement).style.opacity = '0'
        done()
        return
      }
      runNumberAnimation(1, 0, {
        duration,
        ease: SMOOTH_EASE,
        onUpdate: (v: number) => {
          ;(el as HTMLElement).style.opacity = String(v)
        },
        onComplete: done,
      })
    },
  }
}

export const GoeyToast = defineComponent({
  name: 'GoeyToast',
  props: {
    title: { type: String, required: true },
    description: { type: null as unknown as PropType<VNodeChild>, default: undefined },
    type: { type: String as PropType<GoeyToastType>, required: true },
    action: { type: Object as PropType<GoeyToastAction>, default: undefined },
    icon: { type: null as unknown as PropType<VNodeChild>, default: undefined },
    phase: { type: String as PropType<GoeyToastPhase>, required: true },
    classNames: { type: Object as PropType<GoeyToastClassNames>, default: undefined },
    fillColor: { type: String, default: '#ffffff' },
    borderColor: { type: String, default: undefined },
    borderWidth: { type: Number, default: undefined },
    timing: { type: Object as PropType<GoeyToastTimings>, default: undefined },
    spring: { type: null as unknown as PropType<boolean | undefined>, default: undefined },
    bounce: { type: Number as PropType<number | undefined>, default: undefined },
    toastId: { type: [String, Number] as PropType<string | number | undefined>, default: undefined },
  },
  setup(props) {
    const prefersReducedMotion = usePrefersReducedMotion()

    const actionSuccess = ref<string | null>(null)
    const dismissing = ref(false)
    const hovered = ref(false)
    const showBody = ref(false)

    const hoveredRef = ref(false)
    const collapsingRef = ref(false)
    const preDismissRef = ref(false)
    const collapseEndTime = ref(0)
    const expandedDimsRef = ref({ pw: 0, bw: 0, th: 0 })
    const remainingRef = ref<number | null>(null)
    const timerStartRef = ref(0)
    const reExpandingRef = ref(false)
    const headerSquished = ref(false)
    const mountSquished = ref(false)
    const lastSquishTime = ref(0)

    const wrapperRef = ref<HTMLDivElement | null>(null)
    const pathRef = ref<SVGPathElement | null>(null)
    const headerRef = ref<HTMLDivElement | null>(null)
    const contentRef = ref<HTMLDivElement | null>(null)

    const morphCtrl = ref<AnimateCtrl | null>(null)
    const pillResizeCtrl = ref<AnimateCtrl | null>(null)
    const headerSquishCtrl = ref<AnimateCtrl | null>(null)
    const blobSquishCtrl = ref<AnimateCtrl | null>(null)
    const shakeCtrl = ref<AnimateCtrl | null>(null)

    const dismissTimer = ref<ReturnType<typeof setTimeout> | null>(null)
    const delayedMeasureTimer = ref<ReturnType<typeof setTimeout> | null>(null)
    const showBodyDelayTimer = ref<ReturnType<typeof setTimeout> | null>(null)
    const iconKey = ref('')

    const morphTRef = ref(0)
    const aDims = ref({ pw: 0, bw: 0, th: 0 })
    const dimsRef = ref({ pw: 0, bw: 0, th: 0 })
    const dims = ref({ pw: 0, bw: 0, th: 0 })

    let resizeObserver: ResizeObserver | null = null
    let unregisterObserver: (() => void) | null = null

    const effectiveTitle = computed(() => actionSuccess.value ?? props.title)
    const effectivePhase = computed<GoeyToastPhase>(() => (actionSuccess.value ? 'success' : props.phase))
    const effectiveDescription = computed(() => (actionSuccess.value ? undefined : props.description))
    const effectiveAction = computed(() => (actionSuccess.value ? undefined : props.action))

    const isLoading = computed(() => effectivePhase.value === 'loading')
    const hasDescription = computed(() => Boolean(effectiveDescription.value))
    const hasAction = computed(() => Boolean(effectiveAction.value))
    const isExpanded = computed(() => (hasDescription.value || hasAction.value) && !dismissing.value)
    const hasDims = computed(() => dims.value.pw > 0 && dims.value.bw > 0 && dims.value.th > 0)

    const useSpring = computed(() => props.spring ?? getGoeySpring())
    const bounceVal = computed(() => props.bounce ?? getGoeyBounce() ?? 0.4)

    const flush = () => {
      const { pw: p, bw: b, th: hValue } = aDims.value
      if (p <= 0 || b <= 0 || hValue <= 0) return

      const t = Math.max(0, Math.min(1, morphTRef.value))
      const pos = getGoeyPosition()
      const isRight = pos?.includes('right') ?? false
      const isCenter = pos?.includes('center') ?? false

      if (isCenter) {
        const centerBw = Math.max(dimsRef.value.bw, expandedDimsRef.value.bw, p)
        pathRef.value?.setAttribute('d', morphPathCenter(p, centerBw, hValue, t))
      } else {
        pathRef.value?.setAttribute('d', morphPath(p, b, hValue, t))
      }

      if (t >= 1) {
        if (wrapperRef.value) wrapperRef.value.style.width = ''
        if (contentRef.value) {
          contentRef.value.style.width = ''
          contentRef.value.style.overflow = ''
          contentRef.value.style.maxHeight = ''
          contentRef.value.style.clipPath = ''
        }
        return
      }

      if (t > 0) {
        const targetBw = dimsRef.value.bw
        const targetTh = dimsRef.value.th
        const pillW = Math.min(p, b)
        const currentW = pillW + (b - pillW) * t
        const currentH = PH + (targetTh - PH) * t
        const centerFullW = isCenter ? Math.max(dimsRef.value.bw, expandedDimsRef.value.bw, p) : 0

        if (wrapperRef.value) {
          wrapperRef.value.style.width = (isCenter ? centerFullW : currentW) + 'px'
        }

        if (contentRef.value) {
          contentRef.value.style.width = (isCenter ? centerFullW : targetBw) + 'px'
          contentRef.value.style.overflow = 'hidden'
          contentRef.value.style.maxHeight = currentH + 'px'
          if (isCenter) {
            const clip = (centerFullW - currentW) / 2
            contentRef.value.style.clipPath = `inset(0 ${clip}px 0 ${clip}px)`
          } else {
            const clip = targetBw - currentW
            contentRef.value.style.clipPath = isRight
              ? `inset(0 0 0 ${clip}px)`
              : `inset(0 ${clip}px 0 0)`
          }
        }
        return
      }

      const pillW = Math.min(p, b)
      if (wrapperRef.value) {
        const centerBw = isCenter ? Math.max(dimsRef.value.bw, expandedDimsRef.value.bw, p) : pillW
        wrapperRef.value.style.width = centerBw + 'px'
      }
      if (contentRef.value) {
        if (isCenter) {
          const centerBwVal = Math.max(dimsRef.value.bw, expandedDimsRef.value.bw, p)
          contentRef.value.style.width = centerBwVal + 'px'
          const clip = (centerBwVal - pillW) / 2
          contentRef.value.style.clipPath = `inset(0 ${clip}px 0 ${clip}px)`
        } else {
          contentRef.value.style.width = ''
          contentRef.value.style.clipPath = ''
        }
        contentRef.value.style.overflow = 'hidden'
        contentRef.value.style.maxHeight = PH + 'px'
      }
    }

    const measure = () => {
      if (!headerRef.value || !contentRef.value) return
      const wrapper = wrapperRef.value
      const savedW = wrapper?.style.width ?? ''
      const savedOv = contentRef.value.style.overflow
      const savedMH = contentRef.value.style.maxHeight
      const savedCW = contentRef.value.style.width

      if (wrapper) wrapper.style.width = ''
      contentRef.value.style.overflow = ''
      contentRef.value.style.maxHeight = ''
      contentRef.value.style.width = ''

      const cs = getComputedStyle(contentRef.value)
      const paddingX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
      const pw = headerRef.value.offsetWidth + paddingX
      const bw = contentRef.value.offsetWidth
      const th = contentRef.value.offsetHeight

      if (wrapper) wrapper.style.width = savedW
      contentRef.value.style.overflow = savedOv
      contentRef.value.style.maxHeight = savedMH
      contentRef.value.style.width = savedCW

      dimsRef.value = { pw, bw, th }
      dims.value = { pw, bw, th }
    }

    const triggerLandingSquish = (phase: 'expand' | 'collapse' | 'mount' = 'mount') => {
      if (!wrapperRef.value || prefersReducedMotion.value) return
      if (!useSpring.value) return
      const now = Date.now()
      if (now - lastSquishTime.value < 300) return
      lastSquishTime.value = now

      blobSquishCtrl.value?.stop()
      const el = wrapperRef.value
      const springConfig = phase === 'collapse'
        ? squishSpring(DEFAULT_COLLAPSE_DUR, DEFAULT_COLLAPSE_DUR, bounceVal.value)
        : squishSpring(DEFAULT_EXPAND_DUR, DEFAULT_EXPAND_DUR, bounceVal.value)

      const bScale = bounceVal.value / 0.4
      const compressY = (phase === 'collapse' ? 0.07 : 0.12) * bScale
      const expandX = (phase === 'collapse' ? 0.035 : 0.06) * bScale

      blobSquishCtrl.value = runNumberAnimation(0, 1, {
        ...springConfig,
        onUpdate: (v: number) => {
          const intensity = Math.sin(v * Math.PI)
          const sy = 1 - compressY * intensity
          const sx = 1 + expandX * intensity
          const mirror = el.style.transform?.includes('scaleX(-1)') ? 'scaleX(-1) ' : ''
          el.style.transformOrigin = 'center top'
          el.style.transform = mirror + `scaleX(${sx}) scaleY(${sy})`
        },
        onComplete: () => {
          const right = el.style.transform?.includes('scaleX(-1)')
          el.style.transform = right ? 'scaleX(-1)' : ''
          el.style.transformOrigin = ''
        },
      })
    }

    watch(
      [
        effectiveTitle,
        effectivePhase,
        isExpanded,
        showBody,
        effectiveDescription,
        effectiveAction,
      ],
      () => {
        measure()
        if (delayedMeasureTimer.value) clearTimeout(delayedMeasureTimer.value)
        delayedMeasureTimer.value = setTimeout(measure, 100)
      },
      { flush: 'post', immediate: true },
    )

    watch(
      [() => dims.value.pw, () => dims.value.bw, () => dims.value.th, hasDims, showBody],
      () => {
        if (!hasDims.value || collapsingRef.value) return

        const prev = { ...aDims.value }
        const target = { ...dims.value }

        if (prev.bw <= 0) {
          aDims.value = target
          flush()
          return
        }

        if (morphTRef.value > 0 && morphTRef.value < 1) {
          aDims.value = target
          flush()
          return
        }

        if (showBody.value) {
          aDims.value = target
          flush()
          return
        }

        if (prev.bw === target.bw && prev.pw === target.pw && prev.th === target.th) return

        if (prefersReducedMotion.value) {
          aDims.value = target
          flush()
          return
        }

        pillResizeCtrl.value?.stop()
        if (Date.now() - collapseEndTime.value > 500 && !isExpanded.value) {
          triggerLandingSquish('expand')
        }

        const transition = useSpring.value
          ? { type: 'spring' as const, duration: 0.5, bounce: bounceVal.value * 0.875 }
          : { duration: 0.4, ease: SMOOTH_EASE }

        pillResizeCtrl.value = runNumberAnimation(0, 1, {
          ...transition,
          onUpdate: (t: number) => {
            aDims.value = {
              pw: prev.pw + (target.pw - prev.pw) * t,
              bw: prev.bw + (target.bw - prev.bw) * t,
              th: prev.th + (target.th - prev.th) * t,
            }
            flush()
          },
        })
      },
      { flush: 'post' },
    )

    watch([hasDims, isExpanded], ([hasDimsVal, expanded], _prev, onCleanup) => {
      if (hasDimsVal && !mountSquished.value && !expanded) {
        mountSquished.value = true
        const timer = setTimeout(() => triggerLandingSquish('mount'), 45)
        onCleanup(() => clearTimeout(timer))
      }
    }, { flush: 'post' })

    watch(showBody, (next, prev, onCleanup) => {
      if (!prev && next && !hoveredRef.value) {
        const timer = setTimeout(() => triggerLandingSquish('expand'), 80)
        onCleanup(() => clearTimeout(timer))
      }
    }, { flush: 'post' })

    watch(
      () => props.phase,
      (phase, prevPhase) => {
        if (phase === 'error' && prevPhase !== 'error' && !dismissing.value && wrapperRef.value && !prefersReducedMotion.value) {
          shakeCtrl.value?.stop()
          const el = wrapperRef.value
          const mirror = el.style.transform?.includes('scaleX(-1)') ? 'scaleX(-1) ' : ''
          shakeCtrl.value = runNumberAnimation(0, 1, {
            duration: 0.4,
            ease: 'easeOut',
            onUpdate: (v: number) => {
              const decay = 1 - v
              const shake = Math.sin(v * Math.PI * 6) * decay * 3
              el.style.transform = mirror + `translateX(${shake}px)`
            },
            onComplete: () => {
              el.style.transform = mirror.trim() || ''
            },
          })
        }
      },
    )

    watch(
      isExpanded,
      (expanded) => {
        if (showBodyDelayTimer.value) {
          clearTimeout(showBodyDelayTimer.value)
          showBodyDelayTimer.value = null
        }

        if (expanded) {
          const delay = prefersReducedMotion.value ? 0 : 330
          showBodyDelayTimer.value = setTimeout(() => {
            showBody.value = true
          }, delay)
          return
        }

        morphCtrl.value?.stop()
        pillResizeCtrl.value?.stop()

        if (morphTRef.value > 0) {
          const content = contentRef.value
          const padStyles = content ? getComputedStyle(content) : null
          const padX = padStyles ? parseFloat(padStyles.paddingLeft) + parseFloat(padStyles.paddingRight) : 20
          const targetPw = headerRef.value ? headerRef.value.offsetWidth + padX : aDims.value.pw
          const targetDims = { pw: targetPw, bw: targetPw, th: PH }

          if (prefersReducedMotion.value) {
            morphTRef.value = 0
            collapsingRef.value = false
            preDismissRef.value = false
            showBody.value = false
            aDims.value = { ...targetDims }
            flush()
            return
          }

          const savedDims = expandedDimsRef.value.bw > 0
            ? { ...expandedDimsRef.value }
            : { ...aDims.value }

          const isPreDismiss = preDismissRef.value
          const collapseTransition = (isPreDismiss || !useSpring.value)
            ? { duration: 0.9, ease: SMOOTH_EASE }
            : { type: 'spring' as const, duration: 0.9, bounce: bounceVal.value * 0.875 }

          triggerLandingSquish('collapse')

          morphCtrl.value = runNumberAnimation(morphTRef.value, 0, {
            ...collapseTransition,
            onUpdate: (t: number) => {
              morphTRef.value = t
              aDims.value = {
                pw: targetDims.pw + (savedDims.pw - targetDims.pw) * t,
                bw: targetDims.bw + (savedDims.bw - targetDims.bw) * t,
                th: targetDims.th + (savedDims.th - targetDims.th) * t,
              }
              flush()
            },
            onComplete: () => {
              morphTRef.value = 0
              collapsingRef.value = false
              preDismissRef.value = false
              collapseEndTime.value = Date.now()
              aDims.value = { ...targetDims }
              flush()
              showBody.value = false
            },
          })
          return
        }

        showBody.value = false
        morphTRef.value = 0
        flush()
      },
      { immediate: true },
    )

    watch(
      [showBody, actionSuccess, dismissing, prefersReducedMotion, hovered],
      ([showBodyVal, actionSuccessVal, dismissingVal, reduced, hoveredVal], _prev, onCleanup) => {
        if (!showBodyVal || actionSuccessVal || dismissingVal) return

        const expandDelayMs = reduced ? 0 : 330
        const collapseMs = reduced ? 10 : 900
        const displayMs = props.timing?.displayDuration ?? DEFAULT_DISPLAY_DURATION
        const fullDelay = displayMs - expandDelayMs - collapseMs
        if (fullDelay <= 0) return

        if (hoveredRef.value || hoveredVal) return

        const delay = remainingRef.value ?? fullDelay
        timerStartRef.value = Date.now()

        const timer = setTimeout(() => {
          remainingRef.value = null
          expandedDimsRef.value = { ...aDims.value }
          collapsingRef.value = true
          preDismissRef.value = true
          dismissing.value = true
        }, delay)
        dismissTimer.value = timer

        onCleanup(() => {
          clearTimeout(timer)
          const elapsed = Date.now() - timerStartRef.value
          const remaining = delay - elapsed
          if (remaining > 0 && hoveredRef.value) {
            remainingRef.value = remaining
          }
        })
      },
    )

    const canExpand = computed(() => hasDescription.value || hasAction.value)

    watch([hovered, canExpand, dismissing], ([hoveredVal, canExpandVal, dismissingVal]) => {
      if (!hoveredVal || !canExpandVal || !dismissingVal) return

      morphCtrl.value?.stop()
      collapsingRef.value = false
      preDismissRef.value = false
      remainingRef.value = null
      reExpandingRef.value = true
      dismissing.value = false
      showBody.value = true

      const currentT = morphTRef.value
      const startDims = { ...aDims.value }
      const transition = useSpring.value
        ? { type: 'spring' as const, duration: 0.9, bounce: bounceVal.value }
        : { duration: 0.6, ease: SMOOTH_EASE }

      requestAnimationFrame(() => {
        morphCtrl.value = runNumberAnimation(currentT, 1, {
          ...transition,
          onUpdate: (t: number) => {
            morphTRef.value = t
            const target = dimsRef.value
            aDims.value = {
              pw: startDims.pw + (target.pw - startDims.pw) * t,
              bw: startDims.bw + (target.bw - startDims.bw) * t,
              th: startDims.th + (target.th - startDims.th) * t,
            }
            flush()
          },
          onComplete: () => {
            morphTRef.value = 1
            aDims.value = { ...dimsRef.value }
            reExpandingRef.value = false
            flush()
            syncSonnerHeights(wrapperRef.value)
          },
        })
      })
    })

    watch([() => props.toastId, dismissing, showBody, hovered], ([toastId, dismissingVal, showBodyVal, hoveredVal], _prev, onCleanup) => {
      if (!toastId || !dismissingVal || showBodyVal || hoveredVal) return
      const timer = setTimeout(() => {
        if (!hoveredRef.value) (sonnerToast as any).dismiss(toastId)
      }, 800)
      onCleanup(() => clearTimeout(timer))
    })

    watch([() => props.toastId, actionSuccess, showBody], ([toastId, actionSuccessVal, showBodyVal], _prev, onCleanup) => {
      if (!toastId || !actionSuccessVal || showBodyVal) return
      const timer = setTimeout(() => (sonnerToast as any).dismiss(toastId), 1200)
      onCleanup(() => clearTimeout(timer))
    })

    watch(
      [showBody, prefersReducedMotion, useSpring],
      ([showBodyVal, reduced, springEnabled]) => {
        if (reExpandingRef.value) return
        if (!showBodyVal) {
          morphTRef.value = 0
          morphCtrl.value?.stop()
          flush()
          return
        }

        if (reduced) {
          pillResizeCtrl.value?.stop()
          morphCtrl.value?.stop()
          morphTRef.value = 1
          aDims.value = { ...dimsRef.value }
          flush()
          syncSonnerHeights(wrapperRef.value)
          return
        }

        requestAnimationFrame(() => {
          pillResizeCtrl.value?.stop()
          morphCtrl.value?.stop()
          const startDims = { ...aDims.value }
          const transition = springEnabled
            ? { type: 'spring' as const, duration: 0.9, bounce: bounceVal.value }
            : { duration: 0.6, ease: SMOOTH_EASE }

          morphCtrl.value = runNumberAnimation(0, 1, {
            ...transition,
            onUpdate: (t: number) => {
              morphTRef.value = t
              const target = dimsRef.value
              aDims.value = {
                pw: startDims.pw + (target.pw - startDims.pw) * t,
                bw: startDims.bw + (target.bw - startDims.bw) * t,
                th: startDims.th + (target.th - startDims.th) * t,
              }
              flush()
            },
            onComplete: () => {
              morphTRef.value = 1
              aDims.value = { ...dimsRef.value }
              flush()
              syncSonnerHeights(wrapperRef.value)
            },
          })
        })
      },
      { flush: 'post' },
    )

    watch(
      [showBody, dismissing, actionSuccess, prefersReducedMotion, useSpring],
      ([showBodyVal, dismissingVal, actionSuccessVal, reduced, springEnabled]) => {
        if (!headerRef.value || reduced) return
        headerSquishCtrl.value?.stop()
        const el = headerRef.value

        if (showBodyVal && !dismissingVal && !actionSuccessVal) {
          if (!springEnabled) return
          headerSquished.value = true
          headerSquishCtrl.value = runNumberAnimation(0, 1, {
            ...squishSpring(DEFAULT_EXPAND_DUR, DEFAULT_EXPAND_DUR, bounceVal.value),
            onUpdate: (v: number) => {
              const scale = 1 - 0.05 * v
              const pushY = v
              el.style.transform = `scale(${scale}) translateY(${pushY}px)`
            },
          })
          return
        }

        if (headerSquished.value) {
          headerSquished.value = false
          const isSpringCollapse = !preDismissRef.value && springEnabled
          const transition = isSpringCollapse
            ? squishSpring(DEFAULT_COLLAPSE_DUR, DEFAULT_COLLAPSE_DUR, bounceVal.value)
            : { duration: DEFAULT_COLLAPSE_DUR * 0.5, ease: SMOOTH_EASE }

          headerSquishCtrl.value = runNumberAnimation(1, 0, {
            ...transition,
            onUpdate: (v: number) => {
              const scale = 1 - 0.05 * v
              const pushY = v
              el.style.transform = `scale(${scale}) translateY(${pushY}px)`
            },
            onComplete: () => {
              el.style.transform = ''
            },
          })
        }
      },
    )

    const handleActionClick = () => {
      const action = effectiveAction.value
      if (!action) return

      if (action.successLabel) {
        expandedDimsRef.value = { ...aDims.value }
        collapsingRef.value = true
        actionSuccess.value = action.successLabel
      }

      try {
        action.onClick()
      } catch {
        // onClick errors should not block morph-back
      }
    }

    const renderIcon = () => {
      if (!actionSuccess.value && props.icon) return props.icon
      if (isLoading.value) return h(SpinnerIcon, { size: 18, className: styles.spinnerSpin })
      const IconComponent = phaseIconMap[effectivePhase.value as Exclude<GoeyToastPhase, 'loading'>]
      return h(IconComponent, { size: 18 })
    }

    const renderDescription = () => {
      if (!hasDescription.value) return null
      return h(Transition, {
        ...makeOpacityTransition(0.35, () => prefersReducedMotion.value),
      }, {
        default: () => (showBody.value && !dismissing.value)
          ? h(
            'div',
            {
              key: 'description',
              class: cn(styles.description, props.classNames?.description),
              style: { textAlign: 'left' } as CSSProperties,
            },
            [effectiveDescription.value as any],
          )
          : null,
      })
    }

    const renderAction = () => {
      const action = effectiveAction.value
      if (!hasAction.value || !action) return null

      return h(Transition, {
        ...makeOpacityTransition(0.35, () => prefersReducedMotion.value, prefersReducedMotion.value ? 0 : 0.1),
      }, {
        default: () => (showBody.value && !dismissing.value)
          ? h('div', {
            key: 'action',
            class: cn(styles.actionWrapper, props.classNames?.actionWrapper),
          }, [
            h('button', {
              class: cn(styles.actionButton, actionColorMap[effectivePhase.value], props.classNames?.actionButton),
              type: 'button',
              'aria-label': action.label,
              onClick: handleActionClick,
            }, action.label),
          ])
          : null,
      })
    }

    const renderIconAndTitle = () => [
      h('div', { class: cn(styles.iconWrapper, props.classNames?.icon) }, [
        h(Transition, {
          mode: 'out-in',
          onBeforeEnter(el) {
            if (prefersReducedMotion.value) return
            const node = el as HTMLElement
            node.style.opacity = '0'
            node.style.transform = 'scale(0.5)'
          },
          onEnter(el, done) {
            if (prefersReducedMotion.value) {
              done()
              return
            }
            runNumberAnimation(0, 1, {
              duration: 0.2,
              onUpdate: (v: number) => {
                const node = el as HTMLElement
                node.style.opacity = String(v)
                node.style.transform = `scale(${0.5 + 0.5 * v})`
              },
              onComplete: done,
            })
          },
          onLeave(el, done) {
            if (prefersReducedMotion.value) {
              done()
              return
            }
            runNumberAnimation(1, 0, {
              duration: 0.2,
              onUpdate: (v: number) => {
                const node = el as HTMLElement
                node.style.opacity = String(v)
                node.style.transform = `scale(${0.5 + 0.5 * v})`
              },
              onComplete: done,
            })
          },
        }, {
          default: () => h('div', { key: iconKey.value }, renderIcon() as any),
        }),
      ]),
      h('span', { class: cn(styles.title, props.classNames?.title) }, effectiveTitle.value),
    ]

    watch([effectivePhase, isLoading, actionSuccess, () => props.icon], () => {
      iconKey.value = isLoading.value ? 'spinner' : `${effectivePhase.value}-${Boolean(props.icon)}-${Boolean(actionSuccess.value)}`
    }, { immediate: true })

    onMounted(() => {
      nextTick(() => {
        measure()
        if (contentRef.value) {
          resizeObserver = new ResizeObserver(measure)
          resizeObserver.observe(contentRef.value)
        }
        const wrapper = wrapperRef.value
        if (wrapper) {
          const ol = wrapper.closest('[data-sonner-toast]')?.parentElement
          if (ol) {
            unregisterObserver = registerSonnerObserver(ol, () => {
              syncSonnerHeights(wrapper)
            })
          }
        }
      })
    })

    onBeforeUnmount(() => {
      morphCtrl.value?.stop()
      pillResizeCtrl.value?.stop()
      headerSquishCtrl.value?.stop()
      blobSquishCtrl.value?.stop()
      shakeCtrl.value?.stop()
      if (dismissTimer.value) clearTimeout(dismissTimer.value)
      if (delayedMeasureTimer.value) clearTimeout(delayedMeasureTimer.value)
      if (showBodyDelayTimer.value) clearTimeout(showBodyDelayTimer.value)
      resizeObserver?.disconnect()
      unregisterObserver?.()
    })

    return () => {
      const position = getGoeyPosition()
      const isRight = position?.includes('right') ?? false
      const isCenter = position?.includes('center') ?? false

      const wrapperStyle: CSSProperties | undefined = isCenter
        ? { margin: '0 auto' }
        : isRight
          ? { marginLeft: 'auto', transform: 'scaleX(-1)' }
          : undefined

      const contentStyle: CSSProperties = isCenter
        ? { textAlign: 'center' }
        : isRight
          ? { transform: 'scaleX(-1)', textAlign: 'right' }
          : { textAlign: 'left' }

      return h(
        'div',
        {
          ref: wrapperRef,
          class: cn(styles.wrapper, props.classNames?.wrapper),
          style: wrapperStyle,
          role: effectivePhase.value === 'error' ? 'alert' : 'status',
          'aria-live': effectivePhase.value === 'error' ? 'assertive' : 'polite',
          'aria-atomic': 'true',
          onMouseenter: () => {
            hoveredRef.value = true
            hovered.value = true
          },
          onMouseleave: () => {
            hoveredRef.value = false
            hovered.value = false
          },
          'data-center': isCenter || undefined,
        },
        [
          h('svg', { class: styles.blobSvg, 'aria-hidden': true }, [
            h('path', {
              ref: pathRef,
              fill: props.fillColor,
              stroke: props.borderColor || 'none',
              strokeWidth: props.borderColor ? (props.borderWidth ?? 1.5) : 0,
            }),
          ]),
          h(
            'div',
            {
              ref: contentRef,
              class: cn(styles.content, showBody.value ? styles.contentExpanded : styles.contentCompact, props.classNames?.content),
              style: contentStyle,
            },
            [
              h('div', {
                ref: headerRef,
                class: cn(styles.header, titleColorMap[effectivePhase.value], props.classNames?.header),
              }, renderIconAndTitle()),
              renderDescription(),
              renderAction(),
            ],
          ),
        ],
      )
    }
  },
})
