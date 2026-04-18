import { join, map, take } from 'lodash'

/**
 * converted binary data in strings to hex format
 */
export function decodeRedisKey(key: string | number[]): string {
  if (key instanceof Array) {
    return join(
      map(key, (k) => {
        if (k >= 32 && k <= 126) {
          return String.fromCharCode(k)
        }
        return '\\x' + k.toString(16).toUpperCase().padStart(2, '0')
      }),
      '',
    )
  }

  return key
}

/**
 * convert char code array to string
 */
export function nativeRedisKey(key: string | number[], truncate?: number): string {
  if (key instanceof Array) {
    let k = key
    if (typeof truncate === 'number' && truncate > 0) {
      k = take(k, truncate)
    }
    return map(k, (c) => String.fromCharCode(c)).join('')
  }
  return key
}
