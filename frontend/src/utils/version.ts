import { get, isEmpty, map, size, split, trimStart } from 'lodash'

/**
 * convert version string to number array
 */
export const toVersionArray = (ver: string): number[] => {
  const v = trimStart(ver, 'v')
  let vParts = split(v, '.')
  if (isEmpty(vParts)) {
    vParts = ['0']
  }
  return map(vParts, (part) => {
    const vNum = parseInt(part, 10)
    return isNaN(vNum) ? 0 : vNum
  })
}

/**
 * compare two version strings
 */
export const compareVersion = (v1: string, v2: string): number => {
  if (v1 !== v2) {
    const v1Nums = toVersionArray(v1)
    const v2Nums = toVersionArray(v2)
    const length = Math.max(size(v1Nums), size(v2Nums))

    for (let i = 0; i < length; i++) {
      const num1 = get(v1Nums, i, 0)
      const num2 = get(v2Nums, i, 0)
      if (num1 !== num2) {
        return num1 > num2 ? 1 : -1
      }
    }
  }
  return 0
}
