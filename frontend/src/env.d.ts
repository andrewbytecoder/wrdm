/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

/** Discrete API (mirrors `window.*` after `setupDiscreteApi`) */
// 全局注入或者框架提供的工具函数
declare const $message: Window['$message']
declare const $notification: Window['$notification']
declare const $dialog: Window['$dialog']
