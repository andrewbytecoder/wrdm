export interface CheckedKey {
  key: string
  redisKey?: string
}

export interface TabItemInit {
  name: string
  title: string
  blank: boolean
  subTab: string
  icon?: string
  expandedKeys?: string[]
  selectedKeys?: string[]
  checkedKeys?: CheckedKey[]
  type?: string
  value?: unknown
  server?: string
  db?: number
  key?: string
  keyCode?: number[] | null
  size?: number
  length?: number
  ttl?: number
  decode?: string
  format?: string
  matchPattern?: string
  end?: boolean
  loading?: boolean
}

/**
 * tab item
 */
export class TabItem {
  name: string
  title: string
  blank: boolean
  subTab: string
  icon?: string
  activatedKey = ''
  expandedKeys: string[]
  selectedKeys: string[]
  checkedKeys: CheckedKey[]
  type?: string
  value?: unknown
  server?: string
  db: number
  key?: string
  keyCode?: number[] | null
  size: number
  length: number
  ttl: number
  decode: string
  format: string
  matchPattern: string
  end: boolean
  loading: boolean

  constructor({
    name,
    title,
    blank,
    subTab,
    icon,
    expandedKeys = [],
    selectedKeys = [],
    checkedKeys = [],
    type,
    value,
    server,
    db = 0,
    key,
    keyCode,
    size = 0,
    length = 0,
    ttl = 0,
    decode = '',
    format = '',
    matchPattern = '',
    end = false,
    loading = false,
  }: TabItemInit) {
    this.name = name
    this.title = title
    this.blank = blank
    this.subTab = subTab
    this.icon = icon
    this.expandedKeys = expandedKeys
    this.selectedKeys = selectedKeys
    this.checkedKeys = checkedKeys
    this.type = type
    this.value = value
    this.server = server
    this.db = db
    this.key = key
    this.keyCode = keyCode
    this.size = size
    this.length = length
    this.ttl = ttl
    this.decode = decode
    this.format = format
    this.matchPattern = matchPattern
    this.end = end
    this.loading = loading
  }
}
