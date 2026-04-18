/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

/** Discrete API (mirrors `window.*` after `setupDiscreteApi`) */
declare const $message: Window['$message']
declare const $notification: Window['$notification']
declare const $dialog: Window['$dialog']
