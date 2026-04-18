import { i18nGlobal } from '@/utils/i18n'
import { padStart } from 'lodash'

/**
 * convert seconds number to human-readable string
 */
export const toHumanReadable = (duration: number): string => {
  const days = Math.floor(duration / 86400)
  const hours = Math.floor((duration % 86400) / 3600)
  const minutes = Math.floor((duration % 3600) / 60)
  const seconds = duration % 60
  const time = `${padStart(String(hours), 2, '0')}:${padStart(String(minutes), 2, '0')}:${padStart(String(seconds), 2, '0')}`
  if (days > 0) {
    return days + i18nGlobal.t('common.unit_day') + ' ' + time
  } else {
    return time
  }
}
