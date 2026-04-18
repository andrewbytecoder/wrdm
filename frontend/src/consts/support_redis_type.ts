/**
 * all redis type
 */
export const types = {
  STRING: 'STRING',
  HASH: 'HASH',
  LIST: 'LIST',
  SET: 'SET',
  ZSET: 'ZSET',
  STREAM: 'STREAM',
  JSON: 'JSON',
} as const

export const typesShortName = {
  STRING: 'S',
  HASH: 'H',
  LIST: 'L',
  SET: 'E',
  ZSET: 'Z',
  STREAM: 'X',
  JSON: 'J',
} as const

/**
 * mark color for redis types
 */
export const typesColor: Record<string, string> = {
  [types.STRING]: '#8B5CF6',
  [types.HASH]: '#3B82F6',
  [types.LIST]: '#10B981',
  [types.SET]: '#F59E0B',
  [types.ZSET]: '#EF4444',
  [types.STREAM]: '#EC4899',
  [types.JSON]: '#828766',
}

/**
 * background mark color for redis types
 */
export const typesBgColor: Record<string, string> = {
  [types.STRING]: '#F2EDFB',
  [types.HASH]: '#E4F0FC',
  [types.LIST]: '#E3F3EB',
  [types.SET]: '#FDF1DF',
  [types.ZSET]: '#FAEAED',
  [types.STREAM]: '#FDE6F1',
  [types.JSON]: '#ECECD9',
}

export function validType(t: string): boolean {
  return Object.prototype.hasOwnProperty.call(types, t)
}

/**
 * icon type in browser tree
 */
export const typesIconStyle = {
  SHORT: 0,
  FULL: 1,
  POINT: 2,
  ICON: 3,
} as const
