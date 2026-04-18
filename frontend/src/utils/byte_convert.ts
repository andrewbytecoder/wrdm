const sizes = ['B', 'KB', 'MB', 'GB', 'TB']

/**
 * convert byte value
 */
export const convertBytes = (bytes: number, decimals = 2): { unit: string; value: number } => {
  if (bytes <= 0) {
    return {
      value: 0,
      unit: sizes[0],
    }
  }

  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const j = Math.min(i, sizes.length - 1)
  return {
    value: parseFloat((bytes / Math.pow(k, j)).toFixed(decimals)),
    unit: sizes[j],
  }
}

/**
 * format bytes as human-readable string
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
  const res = convertBytes(bytes, decimals)
  return res.value + res.unit
}
