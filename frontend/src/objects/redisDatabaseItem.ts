/**
 * redis database item
 */
export class RedisDatabaseItem {
  db: number
  alias: string
  keyCount: number
  maxKeys: number

  constructor({ db = 0, alias = '', keyCount = 0, maxKeys = 0 }: { db?: number; alias?: string; keyCount?: number; maxKeys?: number } = {}) {
    this.db = db
    this.alias = alias
    this.keyCount = keyCount
    this.maxKeys = maxKeys
  }
}
