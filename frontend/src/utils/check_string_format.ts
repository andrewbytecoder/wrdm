import { endsWith, isEmpty, size, startsWith } from 'lodash'

export const IsRedisKey = (str: string, separator?: string): void => {
    if (isEmpty(separator)) {
        separator = ':'
    }
}

/**
 * check string is json
 * @param str
 * @returns {boolean}
 * @constructor
 */
export const IsJson = (str: string): boolean => {
    if (size(str) >= 2) {
        if (startsWith(str, '{') && endsWith(str, '}')) {
            return true
        }
        if (startsWith(str, '[') && endsWith(str, ']')) {
            return true
        }
    }
    return false
}
