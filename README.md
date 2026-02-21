# goey-toast-vue

A gooey, morphing toast notification plugin for Vue 3.

This package ports the original behavior to Vue while preserving the same animation style, toast lifecycle, and API semantics.

## Install

```bash
npm install goey-toast-vue vue vue-sonner motion
```

## Vue 3 Setup

Import styles once in your app entry:

```ts
import 'goey-toast-vue/styles.css'
```

Install the plugin:

```ts
import { createApp } from 'vue'
import App from './App.vue'
import { createGoeyToastPlugin } from 'goey-toast-vue'
import 'goey-toast-vue/styles.css'

const app = createApp(App)
app.use(createGoeyToastPlugin())
app.mount('#app')
```

Render the toaster once (usually near app root):

```vue
<script setup lang="ts">
import { GoeyToaster } from 'goey-toast-vue'
</script>

<template>
  <GoeyToaster position="bottom-right" />
</template>
```

## Composition API Usage (Recommended)

```vue
<script setup lang="ts">
import { useGoeyToast } from 'goey-toast-vue'

const toast = useGoeyToast()

function save() {
  toast.success('Saved!')
}

function saveWithPromise() {
  toast.promise(Promise.resolve(), {
    loading: 'Saving...',
    success: 'Saved',
    error: 'Failed',
  })
}
</script>

<template>
  <button @click="save">Save</button>
  <button @click="saveWithPromise">Save (Promise)</button>
</template>
```

Promise toast with full options:

```ts
const toast = useGoeyToast()

toast.promise(saveData(), {
  loading: 'Saving...',
  success: 'Saved',
  error: 'Failed',
  description: {
    success: 'Your data is synced.',
    error: (err) => `Reason: ${String(err)}`,
  },
  action: {
    error: {
      label: 'Retry',
      onClick: () => {},
    },
  },
})
```

## Plugin Helpers

The plugin provides:

- Global component: `GoeyToaster`
- Injection key: `GOEY_TOAST_KEY`
- Composable: `useGoeyToast()`
- Optional global property: `this.$goeyToast`

If you need global property access (Options API), enable it explicitly:

```ts
app.use(createGoeyToastPlugin({ registerGlobalProperty: true }))
```

## API

`useGoeyToast()` returns the same toast API below.

### `goeyToast`

- `goeyToast(title, options?)`
- `goeyToast.success(title, options?)`
- `goeyToast.error(title, options?)`
- `goeyToast.warning(title, options?)`
- `goeyToast.info(title, options?)`
- `goeyToast.promise(promise, data)`
- `goeyToast.dismiss(toastId?)`

### `GoeyToastOptions`

- `description?: VNodeChild`
- `action?: { label: string; onClick: () => void; successLabel?: string }`
- `icon?: VNodeChild`
- `duration?: number`
- `id?: string | number`
- `classNames?: GoeyToastClassNames`
- `fillColor?: string`
- `borderColor?: string`
- `borderWidth?: number`
- `timing?: { displayDuration?: number }`
- `spring?: boolean`
- `bounce?: number`

### `GoeyToaster` props

- `position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'`
- `duration?: number`
- `gap?: number`
- `offset?: number | string`
- `theme?: 'light' | 'dark'`
- `toastOptions?: Record<string, unknown>`
- `expand?: boolean`
- `closeButton?: boolean`
- `richColors?: boolean`
- `visibleToasts?: number`
- `dir?: 'ltr' | 'rtl'`
- `spring?: boolean`
- `bounce?: number`

## Publish to npm

1. Build and validate:

```bash
npm install
npm run typecheck
npm run build
```

2. Dry run package contents:

```bash
npm pack --dry-run
```

3. Publish:

```bash
npm publish --access public
```
