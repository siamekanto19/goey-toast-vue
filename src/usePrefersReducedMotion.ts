import { onMounted, onBeforeUnmount, ref } from 'vue'

const QUERY = '(prefers-reduced-motion: reduce)'

function getInitialState(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia(QUERY).matches
}

export function usePrefersReducedMotion() {
  const prefersReducedMotion = ref(getInitialState())
  let mql: MediaQueryList | null = null
  let handler: ((event: MediaQueryListEvent) => void) | null = null

  onMounted(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    mql = window.matchMedia(QUERY)
    handler = (event: MediaQueryListEvent) => {
      prefersReducedMotion.value = event.matches
    }
    mql.addEventListener('change', handler)
  })

  onBeforeUnmount(() => {
    if (mql && handler) {
      mql.removeEventListener('change', handler)
    }
  })

  return prefersReducedMotion
}
