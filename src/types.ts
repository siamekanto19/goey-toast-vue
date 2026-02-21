import type { VNodeChild } from 'vue'

export type GoeyToastType = 'default' | 'success' | 'error' | 'warning' | 'info'

export type GoeyPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export interface GoeyToastTimings {
  displayDuration?: number
}

export interface GoeyToastClassNames {
  wrapper?: string
  content?: string
  header?: string
  title?: string
  icon?: string
  description?: string
  actionWrapper?: string
  actionButton?: string
}

export interface GoeyToastAction {
  label: string
  onClick: () => void
  successLabel?: string
}

export interface GoeyToastData {
  title: string
  description?: VNodeChild
  type: GoeyToastType
  action?: GoeyToastAction
  icon?: VNodeChild
  duration?: number
  classNames?: GoeyToastClassNames
  fillColor?: string
  borderColor?: string
  borderWidth?: number
  spring?: boolean
  bounce?: number
}

export interface GoeyToastOptions {
  description?: VNodeChild
  action?: GoeyToastAction
  icon?: VNodeChild
  duration?: number
  id?: string | number
  classNames?: GoeyToastClassNames
  fillColor?: string
  borderColor?: string
  borderWidth?: number
  timing?: GoeyToastTimings
  spring?: boolean
  bounce?: number
}

export interface GoeyPromiseData<T> {
  loading: string
  success: string | ((data: T) => string)
  error: string | ((error: unknown) => string)
  description?: {
    loading?: VNodeChild
    success?: VNodeChild | ((data: T) => VNodeChild)
    error?: VNodeChild | ((error: unknown) => VNodeChild)
  }
  action?: {
    success?: GoeyToastAction
    error?: GoeyToastAction
  }
  classNames?: GoeyToastClassNames
  fillColor?: string
  borderColor?: string
  borderWidth?: number
  timing?: GoeyToastTimings
  spring?: boolean
  bounce?: number
}

export type GoeyToastPhase = 'loading' | 'default' | 'success' | 'error' | 'warning' | 'info'

export interface GoeyToasterProps {
  position?: GoeyPosition
  duration?: number
  gap?: number
  offset?: number | string
  theme?: 'light' | 'dark'
  toastOptions?: Record<string, unknown>
  expand?: boolean
  closeButton?: boolean
  richColors?: boolean
  visibleToasts?: number
  dir?: 'ltr' | 'rtl'
  spring?: boolean
  bounce?: number
}
