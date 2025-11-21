import { get, isEmpty, last, remove, size, sortedIndexBy, split } from 'lodash'
import { defineStore } from 'pinia'
import {
    AddHashField,
    AddListItem,
    AddZSetValue,
    CloseConnection,
    GetKeyValue,
    ListConnection,
    OpenConnection,
    OpenDatabase,
    RemoveKey,
    RenameKey,
    SetHashValue,
    SetKeyTTL,
    SetKeyValue,
    SetListItem,
    SetSetItem,
    UpdateSetItem,
    UpdateZSetValue,
} from '../../wailsjs/go/services/connectionService.js'
import { ConnectionType } from '../consts/connection_type.js'
import useTabStore from './tab.js'

interface ConnectionItem {
    key: string
    label: string
    name?: string
    type: number
    db?: number
    keys: number
    connected?: boolean
    opened?: boolean
    expanded?: boolean
    children?: ConnectionItem[]
    isLeaf?: boolean
    redisKey?: string
}

interface ListConnectionResponse {
    data: Array<{
        groupName: string
        connections: Array<{
            name: string
        }>
    }>
}

interface OpenConnectionResponse {
    data: {
        db: Array<{
            name: string
            keys: number
        }>
    }
    success: boolean
    msg: string
}

interface OpenDatabaseResponse {
    data: {
        keys: Record<string, any>
    }
    success: boolean
    msg: string
}

interface GetKeyValueResponse {
    data: {
        type: string
        ttl: number
        value: any
    }
    success: boolean
    msg: string
}

interface SetKeyValueResponse {
    data: any
    success: boolean
    msg: string
}

interface SetHashValueResponse {
    data: {
        updated?: Record<string, any>
        removed?: string[]
    }
    success: boolean
    msg: string
}

interface AddHashFieldResponse {
    data: {
        updated?: Record<string, any>
    }
    success: boolean
    msg: string
}

interface AddListItemResponse {
    data: {
        left?: any[]
        right?: any[]
    }
    success: boolean
    msg: string
}

interface SetListItemResponse {
    data: {
        updated?: Record<string, any>
        removed?: string[]
    }
    success: boolean
    msg: string
}

interface SetSetItemResponse {
    success: boolean
    msg: string
}

interface UpdateSetItemResponse {
    success: boolean
    msg: string
}

interface AddZSetValueResponse {
    success: boolean
    msg: string
}

interface UpdateZSetValueResponse {
    data: {
        updated?: Record<string, any>
        removed?: any[]
    }
    success: boolean
    msg: string
}

interface SelectParams {
    key: string
    name: string
    db: number
    type: number
    redisKey: string
}

interface UpsertTabParams {
    server: string
    db: number
    type: string
    ttl: number
    key: string
    value: any
}

const separator = ':'

const useConnectionStore = defineStore('connection', {
    state: () => ({
        connections: [] as ConnectionItem[], // all connections list
    }),

    getters: {},

    actions: {
        /**
         * Load all store connections struct from local profile
         */
        async initConnection(): Promise<void> {
            if (!isEmpty(this.connections)) {
                return
            }
            const { data = [{ groupName: '', connections: [] }] } = await ListConnection() as unknown as ListConnectionResponse
            for (let i = 0; i < data.length; i++) {
                const group = data[i]
                // Top level group
                if (isEmpty(group.groupName)) {
                    for (let j = 0; j < group.connections.length; j++) {
                        const item = group.connections[j]
                        this.connections.push({
                            keys: 0,
                            key: item.name,
                            label: item.name,
                            name: item.name,
                            type: ConnectionType.Server
                            // isLeaf: false,
                        })
                    }
                } else {
                    // Custom group
                    const children: ConnectionItem[] = []
                    for (let j = 0; j < group.connections.length; j++) {
                        const item = group.connections[j]
                        const value = group.groupName + '/' + item.name
                        children.push({
                            keys: 0,
                            key: value,
                            label: item.name,
                            name: item.name,
                            type: ConnectionType.Server,
                            children: j === group.connections.length - 1 ? undefined : []
                            // isLeaf: false,
                        })
                    }
                    this.connections.push({
                        keys: 0,
                        key: group.groupName,
                        label: group.groupName,
                        type: ConnectionType.Group,
                        children,
                    })
                }
            }
            console.debug(JSON.stringify(this.connections))
        },

        /**
         * Open connection
         * @param {string} connName
         */
        async openConnection(connName: string): Promise<void> {
            const { data, success, msg } = await OpenConnection(connName) as unknown as OpenConnectionResponse
            if (!success) {
                throw new Error(msg)
            }
            // append to db node to current connection
            const connNode = this.getConnection(connName)
            if (connNode == null) {
                throw new Error('no such connection')
            }
            const { db } = data
            if (isEmpty(db)) {
                throw new Error('no db loaded')
            }
            const children: ConnectionItem[] = []
            for (let i = 0; i < db.length; i++) {
                children.push({
                    key: `${connName}/${db[i].name}`,
                    label: db[i].name,
                    name: connName,
                    keys: db[i].keys,
                    db: i,
                    type: ConnectionType.RedisDB,
                    // isLeaf: false,
                })
            }
            connNode.children = children
            connNode.connected = true
        },

        /**
         * Close connection
         * @param {string} connName
         */
        async closeConnection(connName: string): Promise<boolean> {
            const { success, msg } = await CloseConnection(connName)
            if (!success) {
                // throw new Error(msg)
                return false
            }

            // successful close connection, remove all children
            const connNode = this.getConnection(connName)
            if (connNode == null) {
                // throw new Error('no such connection')
                return false
            }
            connNode.children = undefined
            connNode.isLeaf = undefined
            connNode.connected = false
            connNode.expanded = false
            return true
        },

        /**
         * Get Connection by path name
         * @param {string} connName
         */
        getConnection(connName: string): ConnectionItem | null {
            const conn = this.connections
            for (let i = 0; i < conn.length; i++) {
                if (conn[i].type === ConnectionType.Server && conn[i].key === connName) {
                    return conn[i]
                } else if (conn[i].type === ConnectionType.Group) {
                    const children = conn[i].children
                    if (children) {
                        for (let j = 0; j < children.length; j++) {
                            if (children[j].type === ConnectionType.Server && children[j].key === connName) {
                                return children[j]
                            }
                        }
                    }
                }
            }
            return null
        },

        /**
         * Open database and load all keys
         * @param connName
         * @param db
         */
        async openDatabase(connName: string, db: number): Promise<void> {
            const { data, success, msg } = await OpenDatabase(connName, db) as unknown as OpenDatabaseResponse
            if (!success) {
                throw new Error(msg)
            }
            const { keys = {} } = data
            if (isEmpty(keys)) {
                const connNode = this.getConnection(connName)
                if (connNode) {
                    const { children = [] } = connNode
                    if (children[db]) {
                        children[db].children = []
                        children[db].opened = true
                    }
                }
                return
            }

            // insert child to children list by order
            const sortedInsertChild = (childrenList: ConnectionItem[], item: ConnectionItem) => {
                const insertIdx = sortedIndexBy(childrenList, item, 'key')
                childrenList.splice(insertIdx, 0, item)
                // childrenList.push(item)
            }
            // update all node item's children num
            const updateChildrenNum = (node: ConnectionItem) => {
                let count = 0
                const totalChildren = size(node.children)
                if (totalChildren > 0) {
                    for (const elem of node.children!) {
                        updateChildrenNum(elem)
                        count += elem.keys
                    }
                } else {
                    count += 1
                }
                node.keys = count
                // node.children = sortBy(node.children, 'label')
            }

            const keyStruct: ConnectionItem[] = []
            const mark: Record<string, ConnectionItem> = {}
            for (const key in keys) {
                const keyPart = split(key, separator)
                // const prefixLen = size(keyPart) - 1
                const len = size(keyPart)
                let handlePath = ''
                let ks = keyStruct
                for (let i = 0; i < len; i++) {
                    handlePath += keyPart[i]
                    if (i !== len - 1) {
                        // layer
                        const treeKey = `${handlePath}@${ConnectionType.RedisKey}`
                        if (!mark.hasOwnProperty(treeKey)) {
                            mark[treeKey] = {
                                key: `${connName}/db${db}/${treeKey}`,
                                label: keyPart[i],
                                name: connName,
                                db,
                                keys: 0,
                                redisKey: handlePath,
                                type: ConnectionType.RedisKey,
                                children: [],
                            }
                            sortedInsertChild(ks, mark[treeKey])
                        }
                        ks = mark[treeKey].children!
                        handlePath += separator
                    } else {
                        // key
                        const treeKey = `${handlePath}@${ConnectionType.RedisValue}`
                        mark[treeKey] = {
                            key: `${connName}/db${db}/${treeKey}`,
                            label: keyPart[i],
                            name: connName,
                            db,
                            keys: 0,
                            redisKey: handlePath,
                            type: ConnectionType.RedisValue,
                        }
                        sortedInsertChild(ks, mark[treeKey])
                    }
                }
            }

            // append db node to current connection's children
            const connNode = this.getConnection(connName)
            if (connNode) {
                const { children = [] } = connNode
                if (children[db]) {
                    children[db].children = keyStruct
                    children[db].opened = true
                    updateChildrenNum(children[db])
                }
            }
        },

        /**
         * select node
         * @param key
         * @param name
         * @param db
         * @param type
         * @param redisKey
         */
        select({ key, name, db, type, redisKey }: SelectParams) {
            if (type === ConnectionType.RedisValue) {
                console.log(`[click]key:${key} db: ${db} redis key: ${redisKey}`)

                // async get value for key
                this.loadKeyValue(name, db, redisKey).then(() => {})
            }
        },

        /**
         * load redis key
         * @param server
         * @param db
         * @param key
         */
        async loadKeyValue(server: string, db: number, key: string): Promise<void> {
            try {
                const { data, success, msg } = await GetKeyValue(server, db, key) as unknown as GetKeyValueResponse
                if (success) {
                    const { type, ttl, value } = data
                    const tab = useTabStore()
                    tab.upsertTab({
                        server,
                        db,
                        type,
                        ttl,
                        key,
                        value,
                    } as UpsertTabParams)
                } else {
                    console.warn('TODO: handle get key fail')
                }
            } finally {
            }
        },

        /**
         *
         * @param {string} connName
         * @param {number} db
         * @param {string} key
         * @private
         */
        _addKey(connName: string, db: number, key: string) {
            const connNode = this.getConnection(connName)
            if (!connNode) return

            const { children: dbs = [] } = connNode
            const dbDetail = get(dbs, db,  {
                key: '',
                label: '',
                type: ConnectionType.Server, // 假设你有一个表示未知类型的枚举值
                keys: 0,
            })

            if (dbDetail == null) {
                return
            }

            const descendantChain: ConnectionItem[] = [dbDetail]

            const keyPart = split(key, separator)
            let redisKey = ''
            const keyLen = size(keyPart)
            let added = false
            for (let i = 0; i < keyLen; i++) {
                redisKey += keyPart[i]

                const node = last(descendantChain)
                if (!node) continue

                const nodeList = get(node, 'children', []) as ConnectionItem[]
                const len = size(nodeList)
                const isLastKeyPart = i === keyLen - 1
                for (let j = 0; j < len + 1; j++) {
                    const treeKey = get(nodeList[j], 'key')
                    const isLast = j >= len - 1
                    const currentKey = `${connName}/db${db}/${redisKey}@${
                        isLastKeyPart ? ConnectionType.RedisValue : ConnectionType.RedisKey
                    }`
                    if (treeKey > currentKey || isLast) {
                        // out of search range, add new item
                        if (isLastKeyPart) {
                            // key not exists, add new one
                            const item: ConnectionItem = {
                                key: currentKey,
                                label: keyPart[i],
                                name: connName,
                                db,
                                keys: 1,
                                redisKey,
                                type: ConnectionType.RedisValue,
                            }
                            if (isLast) {
                                nodeList.push(item)
                            } else {
                                nodeList.splice(j, 0, item)
                            }
                            added = true
                        } else {
                            // layer not exists, add new one
                            const item: ConnectionItem = {
                                key: currentKey,
                                label: keyPart[i],
                                name: connName,
                                db,
                                keys: 0,
                                redisKey,
                                type: ConnectionType.RedisKey,
                                children: [],
                            }
                            if (isLast) {
                                nodeList.push(item)
                                descendantChain.push(last(nodeList)!)
                            } else {
                                nodeList.splice(j, 0, item)
                                descendantChain.push(nodeList[j])
                            }
                            redisKey += separator
                            added = true
                        }
                        break
                    } else if (treeKey === currentKey) {
                        if (isLastKeyPart) {
                            // same key exists, do nothing
                            console.log('TODO: same key exist, do nothing now, should replace value later')
                        } else {
                            // same group exists, find into it's children
                            descendantChain.push(nodeList[j])
                            redisKey += separator
                        }
                        break
                    }
                }
            }

            // update ancestor node's info
            if (added) {
                const desLen = size(descendantChain)
                for (let i = 0; i < desLen; i++) {
                    const children = get(descendantChain[i], 'children', []) as ConnectionItem[]
                    let keys = 0
                    for (const child of children) {
                        if (child.type === ConnectionType.RedisKey) {
                            keys += get(child, 'keys', 1)
                        } else if (child.type === ConnectionType.RedisValue) {
                            keys += get(child, 'keys', 0)
                        }
                    }
                    descendantChain[i].keys = keys
                }
            }
        },

        /**
         * set redis key
         * @param {string} connName
         * @param {number} db
         * @param {string} key
         * @param {number} keyType
         * @param {any} value
         * @param {number} ttl
         */
        async setKey(connName: string, db: number, key: string, keyType: string, value: any, ttl: number): Promise<{msg?: string, success: boolean}> {
            try {
                const { data, success, msg } = await SetKeyValue(connName, db, key, keyType, value, ttl) as unknown as SetKeyValueResponse
                if (success) {
                    // update tree view data
                    this._addKey(connName, db, key)
                    return { success }
                } else {
                    return { success, msg }
                }
            } catch (e: any) {
                return { success: false, msg: e.message }
            }
        },

        /**
         * update hash field
         * when field is set, newField is null, delete field
         * when field is null, newField is set, add new field
         * when both field and newField are set, and field === newField, update field
         * when both field and newField are set, and field !== newField, delete field and add newField
         * @param {string} connName
         * @param {number} db
         * @param {string} key
         * @param {string} field
         * @param {string} newField
         * @param {string} value
         */
        async setHash(connName: string, db: number, key: string, field: string, newField: string, value: string): Promise<{msg?: string, success: boolean, updated?: Record<string, any>}> {
            try {
                const { data, success, msg } = await SetHashValue(connName, db, key, field, newField || '', value || '') as unknown as SetHashValueResponse
                if (success) {
                    const { updated = {} } = data
                    return { success, updated }
                } else {
                    return { success, msg }
                }
            } catch (e: any) {
                return { success: false, msg: e.message }
            }
        },

        /**
         * insert or update hash field item
         * @param {string} connName
         * @param {number} db
         * @param {string} key
         * @param {number }action 0:ignore duplicated fields 1:overwrite duplicated fields
         * @param {string[]} fieldItems field1, value1, filed2, value2...
         */
        async addHashField(connName: string, db: number, key: string, action: number, fieldItems: string[]): Promise<{msg?: string, success: boolean, updated?: Record<string, any>}> {
            try {
                const { data, success, msg } = await AddHashField(connName, db, key, action, fieldItems) as unknown as AddHashFieldResponse
                if (success) {
                    const { updated = {} } = data
                    return { success, updated }
                } else {
                    return { success: false, msg }
                }
            } catch (e: any) {
                return { success: false, msg: e.message }
            }
        },

        /**
         * remove hash field
         * @param {string} connName
         * @param {number} db
         * @param {string} key
         * @param {string} field
         */
        async removeHashField(connName: string, db: number, key: string, field: string): Promise<{msg?: string, success: boolean, removed?: string[]}> {
            try {
                const { data, success, msg } = await SetHashValue(connName, db, key, field, '', '') as unknown as SetHashValueResponse
                if (success) {
                    const { removed = [] } = data
                    return { success, removed }
                } else {
                    return { success, msg }
                }
            } catch (e: any) {
                return { success: false, msg: e.message }
            }
        },

        /**
         * insert list item
         * @param {string} connName
         * @param {number} db
         * @param {string} key
         * @param {int} action 0: push to head, 1: push to tail
         * @param {string[]}values
         */
        async addListItem(connName: string, db: number, key: string, action: number, values: string[]): Promise<any> {
            try {
                return AddListItem(connName, db, key, action, values)
            } catch (e: any) {
                return { success: false, msg: e.message }
            }
        },

        /**
         * prepend item to head of list
         * @param connName
         * @param db
         * @param key
         * @param values
         */
        async prependListItem(connName: string, db: number, key: string, values: string[]): Promise<{msg?: string, success: boolean, item?: any[]}> {
            try {
                const { data, success, msg } = await AddListItem(connName, db, key, 0, values) as unknown as AddListItemResponse
                if (success) {
                    const { left = [] } = data
                    return { success, item: left }
                } else {
                    return { success: false, msg }
                }
            } catch (e: any) {
                return { success: false, msg: e.message }
            }
        },

        /**
         * append item to tail of list
         * @param connName
         * @param db
         * @param key
         * @param values
         */
        async appendListItem(connName: string, db: number, key: string, values: string[]): Promise<{msg?: string, success: boolean, item?: any[]}> {
            try {
                const { data, success, msg } = await AddListItem(connName, db, key, 1, values) as unknown as AddListItemResponse
                if (success) {
                    const { right = [] } = data
                    return { success, item: right }
                } else {
                    return { success: false, msg }
                }
            } catch (e: any) {
                return { success: false, msg: e.message }
            }
        },

        /**
         * update value of list item by index
         * @param {string} connName
         * @param {number} db
         * @param {string} key
         * @param {number} index
         * @param {string} value
         */
        async updateListItem(connName: string, db: number, key: string, index: number, value: string): Promise<{msg?: string, success: boolean, updated?: Record<string, any>}> {
            try {
                const { data, success, msg } = await SetListItem(connName, db, key, index, value) as unknown as SetListItemResponse
                if (success) {
                    const { updated = {} } = data
                    return { success, updated }
                } else {
                    return { success, msg }
                }
            } catch (e: any) {
                return { success: false, msg: e.message }
            }
        },

        /**
         * remove list item
         * @param {string} connName
         * @param {number} db
         * @param {string} key
         * @param {number} index
         */
        async removeListItem(connName: string, db: number, key: string, index: number): Promise<{msg?: string, success: boolean, removed?: string[]}> {
            try {
                const { data, success, msg } = await SetListItem(connName, db, key, index, '') as unknown as SetListItemResponse
                if (success) {
                    const { removed = [] } = data
                    return { success, removed }
                } else {
                    return { success, msg }
                }
            } catch (e: any) {
                return { success: false, msg: e.message }
            }
        },

        /**
         * add item to set
         * @param {string} connName
         * @param {number} db
         * @param {string} key
         * @param {string} value
         */
        async addSetItem(connName: string, db: number, key: string, value: string): Promise<{msg?: string, success: boolean}> {
            try {
                const { success, msg } = await SetSetItem(connName, db, key, false, [value]) as unknown as SetSetItemResponse
                if (success) {
                    return { success }
                } else {
                    return { success, msg }
                }
            } catch (e: any) {
                return { success: false, msg: e.message }
            }
        },

        /**
         * update value of set item
         * @param {string} connName
         * @param {number} db
         * @param {string} key
         * @param {string} value
         * @param {string} newValue
         */
        async updateSetItem(connName: string, db: number, key: string, value: string, newValue: string): Promise<{msg?: string, success: boolean}> {
            try {
                const { success, msg } = await UpdateSetItem(connName, db, key, value, newValue) as unknown as UpdateSetItemResponse
                if (success) {
                    return { success: true }
                } else {
                    return { success, msg }
                }
            } catch (e: any) {
                return { success: false, msg: e.message }
            }
        },

        /**
         * remove item from set
         * @param connName
         * @param db
         * @param key
         * @param value
         */
        async removeSetItem(connName: string, db: number, key: string, value: string): Promise<{msg?: string, success: boolean}> {
            try {
                const { success, msg } = await SetSetItem(connName, db, key, true, [value]) as unknown as SetSetItemResponse
                if (success) {
                    return { success }
                } else {
                    return { success, msg }
                }
            } catch (e: any) {
                return { success: false, msg: e.message }
            }
        },

        /**
         * add item to sorted set
         * @param {string} connName
         * @param {number} db
         * @param {string} key
         * @param {number} action
         * @param {Object.<string, number>} vs value: score
         */
        async addZSetItem(connName: string, db: number, key: string, action: number, vs: Record<string, number>): Promise<{msg?: string, success: boolean}> {
            try {
                const { success, msg } = await AddZSetValue(connName, db, key, action, vs) as unknown as AddZSetValueResponse
                if (success) {
                    return { success }
                } else {
                    return { success, msg }
                }
            } catch (e: any) {
                return { success: false, msg: e.message }
            }
        },

        /**
         * update item of sorted set
         * @param {string} connName
         * @param {number} db
         * @param {string} key
         * @param {string} value
         * @param {string} newValue
         * @param {number} score
         */
        async updateZSetItem(connName: string, db: number, key: string, value: string, newValue: string, score: number): Promise<{msg?: string, success: boolean, updated?: Record<string, any>, removed?: any[]}> {
            try {
                const { data, success, msg } = await UpdateZSetValue(connName, db, key, value, newValue, score) as unknown as UpdateZSetValueResponse
                if (success) {
                    const { updated, removed } = data
                    return { success, updated, removed }
                } else {
                    return { success, msg }
                }
            } catch (e: any) {
                return { success: false, msg: e.message }
            }
        },

        /**
         * remove item from sorted set
         * @param {string} connName
         * @param {number} db
         * @param key
         * @param {string} value
         */
        async removeZSetItem(connName: string, db: number, key: string, value: string): Promise<{msg?: string, success: boolean, removed?: any[]}> {
            try {
                const { data, success, msg } = await UpdateZSetValue(connName, db, key, value, '', 0) as unknown as UpdateZSetValueResponse
                if (success) {
                    const { removed } = data
                    return { success, removed }
                } else {
                    return { success, msg }
                }
            } catch (e: any) {
                return { success: false, msg: e.message }
            }
        },

        /**
         * reset key's ttl
         * @param {string} connName
         * @param {number} db
         * @param {string} key
         * @param {number} ttl
         */
        async setTTL(connName: string, db: number, key: string, ttl: number): Promise<boolean> {
            try {
                const { success, msg } = await SetKeyTTL(connName, db, key, ttl)
                return success === true
            } catch (e: any) {
                return false
            }
        },

        /**
         *
         * @param {string} connName
         * @param {number} db
         * @param {string} key
         * @private
         */
        _removeKey(connName: string, db: number, key: string) {
            const connNode = this.getConnection(connName)
            if (!connNode) return

            const { children: dbs = [] } = connNode
            const dbDetail = get(dbs, db,  {
                key: '',
                label: '',
                type: ConnectionType.Server, // 假设你有一个表示未知类型的枚举值
                keys: 0,
            })

            if (dbDetail == null) {
                return
            }

            const descendantChain: ConnectionItem[] = [dbDetail]
            const keyPart = split(key, separator)
            let redisKey = ''
            const keyLen = size(keyPart)
            let deleted = false
            let forceBreak = false
            for (let i = 0; i < keyLen && !forceBreak; i++) {
                redisKey += keyPart[i]

                const node = last(descendantChain)
                if (!node) continue

                const nodeList = get(node, 'children', []) as ConnectionItem[]
                const len = size(nodeList)
                const isLastKeyPart = i === keyLen - 1
                for (let j = 0; j < len; j++) {
                    const treeKey = get(nodeList[j], 'key')
                    const currentKey = `${connName}/db${db}/${redisKey}@${
                        isLastKeyPart ? ConnectionType.RedisValue : ConnectionType.RedisKey
                    }`
                    if (treeKey > currentKey) {
                        // out of search range, target not exists
                        forceBreak = true
                        break
                    } else if (treeKey === currentKey) {
                        if (isLastKeyPart) {
                            // find target
                            nodeList.splice(j, 1)
                            if (node.keys !== undefined) {
                                node.keys -= 1
                            }
                            deleted = true
                            forceBreak = true
                        } else {
                            // find into it's children
                            descendantChain.push(nodeList[j])
                            redisKey += separator
                        }
                        break
                    }
                }

                if (forceBreak) {
                    break
                }
            }
            // console.log(JSON.stringify(descendantChain))

            // update ancestor node's info
            if (deleted) {
                const desLen = size(descendantChain)
                for (let i = desLen - 1; i > 0; i--) {
                    const children = get(descendantChain[i], 'children', []) as ConnectionItem[]
                    const parent = descendantChain[i - 1]
                    if (isEmpty(children)) {
                        const parentChildren = get(parent, 'children', []) as ConnectionItem[]
                        const k = get(descendantChain[i], 'key')
                        remove(parentChildren, (item) => item.key === k)
                    }
                    if (parent.keys !== undefined) {
                        parent.keys -= 1
                    }
                }
            }
        },

        /**
         * remove redis key
         * @param {string} connName
         * @param {number} db
         * @param {string} key
         */
        async removeKey(connName: string, db: number, key: string): Promise<boolean> {
            try {
                const { data, success, msg } = await RemoveKey(connName, db, key)
                if (success) {
                    // update tree view data
                    this._removeKey(connName, db, key)

                    // set tab content empty
                    const tab = useTabStore()
                    tab.emptyTab(connName)
                    return true
                }
            } finally {
            }
            return false
        },

        /**
         * rename key
         * @param {string} connName
         * @param {number} db
         * @param {string} key
         * @param {string} newKey
         */
        async renameKey(connName: string, db: number, key: string, newKey: string): Promise<{msg?: string, success: boolean}> {
            const { success = false, msg } = await RenameKey(connName, db, key, newKey)
            if (success) {
                // delete old key and add new key struct
                this._removeKey(connName, db, key)
                this._addKey(connName, db, newKey)
                return { success: true }
            } else {
                return { success: false, msg }
            }
        },
    },
})

export default useConnectionStore
