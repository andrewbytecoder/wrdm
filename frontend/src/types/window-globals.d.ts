/** Globals attached in `utils/discrete.ts` */

declare global {
  interface Window {
    $message: {
      error: (content: string, option?: unknown) => unknown
      info: (content: string, option?: unknown) => unknown
      loading: (content: string, option?: Record<string, unknown>) => unknown
      success: (content: string, option?: unknown) => unknown
      warning: (content: string, option?: unknown) => unknown
    }
    $notification: {
      show: (option: Record<string, unknown>) => { destroy: () => void }
      error: (content: string, option?: Record<string, unknown>) => unknown
      info: (content: string, option?: Record<string, unknown>) => unknown
      success: (content: string, option?: Record<string, unknown>) => unknown
      warning: (content: string, option?: Record<string, unknown>) => unknown
    }
    $dialog: {
      show: (option: Record<string, unknown>) => unknown
      warning: (content: string, onConfirm?: () => void) => unknown
    }
  }
}

export {}
