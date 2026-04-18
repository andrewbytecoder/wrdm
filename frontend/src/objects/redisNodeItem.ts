import { isEmpty, remove, size, sumBy } from 'lodash'
import { ConnectionType } from '@/consts/connection_type'

export interface RedisNodeItemInit {
  key: string
  label: string
  name?: string
  type: number
  db?: number
  redisKey?: string
  redisKeyCode?: number[]
  keyCount?: number
  maxKeys?: number
  isLeaf?: boolean
  opened?: boolean
  expanded?: boolean
  children?: RedisNodeItem[]
  redisType?: string
  redisKeyType?: unknown
}

/**
 * redis node item in tree view
 */
export class RedisNodeItem {
  key: string
  label: string
  name?: string
  type: number
  db: number
  redisKey?: string
  redisKeyCode?: number[]
  keyCount: number
  maxKeys: number
  isLeaf: boolean
  opened: boolean
  expanded: boolean
  children?: RedisNodeItem[]
  redisType?: string
  redisKeyType?: unknown

  constructor({
    key,
    label,
    name,
    type,
    db = 0,
    redisKey,
    redisKeyCode,
    keyCount = 0,
    maxKeys = 0,
    isLeaf = false,
    opened = false,
    expanded = false,
    children,
    redisType,
    redisKeyType,
  }: RedisNodeItemInit) {
    this.key = key
    this.label = label
    this.name = name
    this.type = type
    this.db = db
    this.redisKey = redisKey
    this.redisKeyCode = redisKeyCode
    this.keyCount = keyCount
    this.maxKeys = maxKeys
    this.isLeaf = isLeaf
    this.opened = opened
    this.expanded = expanded
    this.children = children
    this.redisType = redisType
    this.redisKeyType = redisKeyType
  }

  private _sortNodes(nodeList: RedisNodeItem[] | undefined) {
    if (nodeList == null) {
      return
    }
    nodeList.sort((a, b) => {
      return a.key > b.key ? 1 : -1
    })
  }

  private _sortingCompare(a: RedisNodeItem, b: RedisNodeItem): number {
    if (a.type !== b.type) {
      return a.type - b.type
    }
    const isANum = !isNaN(Number(a.label))
    const isBNum = !isNaN(Number(b.label))
    if (isANum && isBNum) {
      return parseInt(a.label, 10) - parseInt(b.label, 10)
    } else if (isANum) {
      return -1
    } else if (isBNum) {
      return 1
    }
    return a.label.localeCompare(b.label)
  }

  private _sortedIndex(arr: RedisNodeItem[], item: RedisNodeItem): number {
    for (let i = 0; i < arr.length; i++) {
      const cmpResult = this._sortingCompare(arr[i], item)
      if (cmpResult > 0) {
        return i
      } else if (cmpResult === 0) {
        return i + 1
      }
    }
    return arr.length
  }

  /**
   * sort all node item's children and calculate keys count
   * @param skipSort skip sorting children
   * @returns return whether key count changed
   */
  tidy(skipSort?: boolean): boolean {
    if (this.type === ConnectionType.RedisValue) {
      this.keyCount = 1
    } else if (this.type === ConnectionType.RedisKey || this.type === ConnectionType.RedisDB) {
      let keyCount = 0
      if (!isEmpty(this.children)) {
        if (!skipSort) {
          this.sortChildren()
        }
        for (const child of this.children!) {
          child.tidy(skipSort)
          keyCount += child.keyCount
        }
      } else {
        keyCount = 0
      }
      if (this.keyCount !== keyCount) {
        this.keyCount = keyCount
        return true
      }
    }
    return false
  }

  sortChildren() {
    if (this.children) {
      this.children.sort(this._sortingCompare)
    }
  }

  addChild(child: RedisNodeItem, sorted?: boolean) {
    if (!this.children) {
      this.children = []
    }
    if (!sorted) {
      this.children.push(child)
    } else {
      const idx = this._sortedIndex(this.children, child)
      this.children.splice(idx, 0, child)
    }
  }

  removeChild(predicate: Partial<RedisNodeItem>) {
    if (this.type !== ConnectionType.RedisKey && this.type !== ConnectionType.RedisDB) {
      return 0
    }
    const removed = remove(this.children, predicate as never)
    return size(removed)
  }

  getChildren() {
    return this.children
  }

  reCalcKeyCount() {
    if (this.type === ConnectionType.RedisValue) {
      this.keyCount = 1
    }
    this.keyCount = sumBy(this.children, (c) => c.keyCount)
    return this.keyCount
  }
}
