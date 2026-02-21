import type { App, InjectionKey, Plugin } from 'vue'
import { inject } from 'vue'
import { GoeyToaster } from './components/GoeyToaster'
import { goeyToast } from './goey-toast'

export interface GoeyToastPluginOptions {
  componentName?: string
  registerGlobalProperty?: boolean
  globalPropertyName?: string
}

const DEFAULT_COMPONENT_NAME = 'GoeyToaster'
const DEFAULT_GLOBAL_PROPERTY = '$goeyToast'

export const GOEY_TOAST_KEY: InjectionKey<typeof goeyToast> = Symbol('goey-toast')

export function createGoeyToastPlugin(options: GoeyToastPluginOptions = {}): Plugin {
  const componentName = options.componentName ?? DEFAULT_COMPONENT_NAME
  const registerGlobalProperty = options.registerGlobalProperty ?? false
  const globalPropertyName = options.globalPropertyName ?? DEFAULT_GLOBAL_PROPERTY

  return {
    install(app: App) {
      app.component(componentName, GoeyToaster)
      app.provide(GOEY_TOAST_KEY, goeyToast)

      if (registerGlobalProperty) {
        ;(app.config.globalProperties as Record<string, unknown>)[globalPropertyName] = goeyToast
        ;(app.config.globalProperties as Record<string, unknown>).$goeyToast = goeyToast
      }
    },
  }
}

export function useGoeyToast() {
  return inject(GOEY_TOAST_KEY, goeyToast)
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $goeyToast?: typeof goeyToast
  }
}
