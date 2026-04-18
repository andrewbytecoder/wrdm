import { padStart, size, startsWith } from 'lodash'

export interface RGB {
  r: number
  g: number
  b: number
  a?: number
}

/**
 * parse hex color to rgb object
 */
export function parseHexColor(hex: string): RGB {
  if (size(hex) < 6) {
    return { r: 0, g: 0, b: 0 }
  }
  let h = hex
  if (startsWith(h, '#')) {
    h = h.slice(1)
  }
  const bigint = parseInt(h, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return { r, g, b }
}

/**
 * do gamma correction with an RGB object
 */
export function hexGammaCorrection(rgb: RGB | unknown, gamma: number): RGB {
  if (typeof rgb !== 'object' || rgb == null || !('r' in rgb)) {
    return { r: 0, g: 0, b: 0 }
  }
  const c = rgb as RGB
  return {
    r: Math.max(0, Math.min(255, Math.round(c.r * gamma))),
    g: Math.max(0, Math.min(255, Math.round(c.g * gamma))),
    b: Math.max(0, Math.min(255, Math.round(c.b * gamma))),
  }
}

/**
 * mix two colors
 */
export function mixColors(rgba1: RGB, rgba2: RGB, weight = 0.5): RGB {
  const a1 = rgba1.a === undefined ? 255 : rgba1.a
  const a2 = rgba2.a === undefined ? 255 : rgba2.a
  return {
    r: Math.floor(rgba1.r * (1 - weight) + rgba2.r * weight),
    g: Math.floor(rgba1.g * (1 - weight) + rgba2.g * weight),
    b: Math.floor(rgba1.b * (1 - weight) + rgba2.b * weight),
    a: Math.floor(a1 * (1 - weight) + a2 * weight),
  }
}

/**
 * RGB object to hex color string
 */
export function toHexColor(rgb: RGB): string {
  return (
    '#' +
    padStart(rgb.r.toString(16), 2, '0') +
    padStart(rgb.g.toString(16), 2, '0') +
    padStart(rgb.b.toString(16), 2, '0')
  )
}
