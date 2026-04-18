import usePreferencesStore from 'stores/preferences'
import { createDiscreteApi, darkTheme } from 'naive-ui'
import { darkThemeOverrides, themeOverrides } from '@/utils/theme'
import { i18nGlobal } from '@/utils/i18n'
import { computed } from 'vue'

// Discrete API instances from naive-ui (avoid coupling to internal export names)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setupMessage(message: any) {
  return {
    error: (content: string, option: Record<string, unknown> | null = null) => {
      return message.error(content, option ?? undefined)
    },
    info: (content: string, option: Record<string, unknown> | null = null) => {
      return message.info(content, option ?? undefined)
    },
    loading: (content: string, option: Record<string, unknown> = {}) => {
      option.duration = option.duration != null ? option.duration : 30000
      option.keepAliveOnHover = option.keepAliveOnHover !== undefined ? option.keepAliveOnHover : true
      return message.loading(content, option)
    },
    success: (content: string, option: Record<string, unknown> | null = null) => {
      return message.success(content, option ?? undefined)
    },
    warning: (content: string, option: Record<string, unknown> | null = null) => {
      return message.warning(content, option ?? undefined)
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setupNotification(notification: any) {
  return {
    show(option: Record<string, unknown>) {
      return notification.create(option as never)
    },
    error: (content: string, option: Record<string, unknown> = {}) => {
      option.content = content
      option.title = option.title || i18nGlobal.t('common.error')
      return notification.error(option as never)
    },
    info: (content: string, option: Record<string, unknown> = {}) => {
      option.content = content
      return notification.info(option as never)
    },
    success: (content: string, option: Record<string, unknown> = {}) => {
      option.content = content
      option.title = option.title || i18nGlobal.t('common.success')
      return notification.success(option as never)
    },
    warning: (content: string, option: Record<string, unknown> = {}) => {
      option.content = content
      option.title = option.title || i18nGlobal.t('common.warning')
      return notification.warning(option as never)
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setupDialog(dialog: any) {
  return {
    show(option: Record<string, unknown>) {
      option.closable = option.closable === true
      option.autoFocus = option.autoFocus === true
      option.transformOrigin = 'center'
      return dialog.create(option as never)
    },
    warning: (content: string, onConfirm?: () => void) => {
      return dialog.warning({
        title: i18nGlobal.t('common.warning'),
        content: content,
        closable: false,
        autoFocus: false,
        transformOrigin: 'center',
        positiveText: i18nGlobal.t('common.confirm'),
        negativeText: i18nGlobal.t('common.cancel'),
        onPositiveClick: () => {
          onConfirm && onConfirm()
        },
      })
    },
  }
}

/**
 * setup discrete api and bind global component (like dialog, message, alert) to window
 */
export async function setupDiscreteApi(): Promise<void> {
  const prefStore = usePreferencesStore()
  const configProviderProps = computed(() => ({
    theme: prefStore.isDark ? darkTheme : undefined,
    themeOverrides,
  }))
  const { message, dialog, notification } = createDiscreteApi(['message', 'notification', 'dialog'], {
    configProviderProps,
    messageProviderProps: {
      placement: 'bottom',
      keepAliveOnHover: true,
      containerStyle: {
        marginBottom: '38px',
      },
      themeOverrides: prefStore.isDark ? darkThemeOverrides.Message : themeOverrides.Message,
    },
    notificationProviderProps: {
      max: 5,
      placement: 'bottom-right',
      keepAliveOnHover: true,
      containerStyle: {
        marginBottom: '38px',
      },
    },
  })

  window.$message = setupMessage(message)
  window.$notification = setupNotification(notification)
  window.$dialog = setupDialog(dialog)
}
