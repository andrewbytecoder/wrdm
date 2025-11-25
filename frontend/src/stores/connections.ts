import { defineStore } from 'pinia'
import { get, isEmpty, last, remove, size, sortedIndexBy, split, uniq } from 'lodash'
import {
    AddHashField,
    AddListItem,
    AddZSetValue,
    CloseConnection,
    CreateGroup,
    GetConnection,
    GetKeyValue,
    ListConnection,
    OpenConnection,
    OpenDatabase,
    RemoveKey,
    RemoveConnection,
    RemoveGroup,
    RenameKey,
    RenameGroup,
    SaveConnection,
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
import {TreeOption} from 'naive-ui'
import {types} from "../../wailsjs/go/models";

const separator = ':'

// 定义类型
export interface ConnectionItem extends types.Connection  {
    key: string
    label: string
    db?: number
    keys?: number
    connected?: boolean
    opened?: boolean
    expanded?: boolean
    isLeaf?: boolean
    redisKey?: string
    children?: ConnectionItem[]
}

// 数据库 每个redis 默认 16个数据库
export interface DatabaseItem {
    key: string
    label: string
    name: string
    type: number
    db?: number
    keys: number
    opened?: boolean
    expanded?: boolean
    children?: DatabaseItem[]
    redisKey?: string
    isLeaf?: boolean
}

interface ConnectionGroup extends types.ConnectionConfig{
    Type: string
    connections: Array<types.ConnectionConfig>
}

interface ListConnectionResponse {
    data?: ConnectionGroup[]
}

interface OpenConnectionResponse {
    data?: {
        db: Array<{name: string, keys: number}>
    }
    success: boolean
    msg: string
}

interface OpenDatabaseResponse {
    data?: {
        keys: string[]
    }
    success: boolean
    msg: string
}

interface GetKeyValueResponse {
    data?: {
        type: string
        ttl: number
        value: any
    }
    success: boolean
    msg: string
}

interface SetHashValueResponse {
    data?: {
        updated?: Record<string, any>
        removed?: string[]
    }
    success: boolean
    msg: string
}

interface AddHashFieldResponse {
    data?: {
        updated?: Record<string, any>
    }
    success: boolean
    msg: string
}

interface AddListItemResponse {
    data?: {
        left?: any[]
        right?: any[]
    }
    success: boolean
    msg: string
}

interface SetListItemResponse {
    data?: {
        updated?: Record<string, any>
        removed?: string[]
    }
    success: boolean
    msg: string
}

interface UpdateZSetValueResponse {
    data?: {
        updated?: Record<string, any>
        removed?: string[]
    }
    success: boolean
    msg: string
}

interface ConnectionState {
    groups: string[], // all group name
    connections: ConnectionItem[]
    databases: Record<string, DatabaseItem[]>
}

interface SelectParams {
    key: string
    name: string
    db: number
    type: number
    redisKey: string
}

const useConnectionStore = defineStore('connections', {
    state: (): ConnectionState => ({
        groups: [], // all group name
        connections: [], // all connections
        databases: {}, // all databases in opened connections group by name
    }),
    getters: {
        anyConnectionOpened(): boolean {
            return !isEmpty(this.databases)
        },
    },
    actions: {
        /**
         * * load all store connections struct from local profile
         *          * @param {boolean} [force]
         *          * @returns {Promise<void>}
         *          */
        async initConnections(force: boolean): Promise<void> {
            if (!force && !isEmpty(this.connections)) {
                return
            }
            const conns: ConnectionItem[] = []
            const groups: string[] = []
            const  data = await ListConnection()
            for (const conn of data) {
                // Top level group
                if (conn.type !== 'group') {
                    conns.push({
                        name: conn.name,
                        key: conn.name, group: "",
                        convertValues(a: any, classs: any, asMap?: boolean): any {
                        },
                        label: conn.name,
                        type: ConnectionType[ConnectionType.Server]
                    })
                } else {
                    groups.push(conn.name)
                    // Custom group
                    const children: ConnectionItem[] = []
                    for (const item of conn.connections!) {
                        const value:string = conn.name + '/' + item.name

                        children.push({
                            group: "",
                            convertValues(a: any, classs: any, asMap?: boolean): any {
                            },
                            name: item.name,
                            key: value,
                            label: item.name,
                            type: ConnectionType[ConnectionType.Server]
                        })
                    }
                    conns.push({
                        group: "",
                        name: "",
                        convertValues(a: any, classs: any, asMap?: boolean): any {
                        },
                        key: conn.name,
                        label: conn.name,
                        type: ConnectionType[ConnectionType.Group],
                        children: children
                    })
                }
            }
            this.connections = conns
            console.debug(JSON.stringify(this.connections))
            this.groups = uniq(groups)
        },

        /**
         * get connection by name from local profile
         * @param name
         * @returns {Promise<{}|null>}
         */
        async getConnectionProfile(name:string):Promise<types.Connection> {
            try {
                const { data, success } = await GetConnection(name)
                if (success) {
                    return data
                }
            } finally {
            }
            return  this.newDefaultConnection(name)
        },

        /**
         * create a new default connection
         * @param {string} [name]
         * @returns {{types.Connection}}
         */
        newDefaultConnection(name:string):types.Connection {
            return {
                convertValues(a: any, classs: any, asMap?: boolean): any {
                },
                group: '',
                name: name || '',
                addr: '127.0.0.1',
                port: 6379,
                username: '',
                password: '',
                defaultFilter: '*',
                keySeparator: ':',
                connTimeout: 60,
                execTimeout: 60,
                markColor: ''
            }
        },
        /**
         * get database server by name
         * @param name
         * @returns {ConnectionItem|null}
         */
        getConnection(name: string): ConnectionItem | null {
            const conns = this.connections
            for (let i = 0; i < conns.length; i++) {
                if (conns[i].type === ConnectionType[ConnectionType.Server] && conns[i].key === name) {
                    return conns[i]
                } else if (conns[i].type === ConnectionType[ConnectionType.Group]) {
                    const children = conns[i].children || []
                    for (let j = 0; j < children.length; j++) {
                        if (children[j].type === ConnectionType[ConnectionType.Server] && conns[i].key === name) {
                            return children[j]
                        }
                    }
                }
            }
            return null
        },

        /**
         * Create a new connection or update current connection profile
         * @param {string} name set null if create a new connection
         * @param {types.Connection} param
         * @returns {Promise<{success: boolean, [msg]: string}>}
         */
        async saveConnection(name:string, param:types.Connection):Promise<types.JSResp> {
            const { success, msg } = await SaveConnection(name, param)
            if (!success) {
                return { success: false, msg }
            }

            // reload connection list
            await this.initConnections(true)
            return {data: undefined, msg: "save connection success", success: true }
        },

        /**
         * Check if connection is connected
         * @param name
         * @returns {boolean}
         */
        isConnected(name: string): boolean {
            const dbs = get(this.databases, name, [])
            return !isEmpty(dbs)
        },

        /**
         * Open connection
         * @param {string} name
         * @returns {Promise<void>}
         */
        async openConnection(name: string): Promise<void> {
            if (this.isConnected(name)) {
                return
            }

            const { data, success, msg } = await OpenConnection(name) as OpenConnectionResponse
            if (!success) {
                throw new Error(msg)
            }
            // append to db node to current connection
            // const connNode = this.getConnection(name)
            // if (connNode == null) {
            //     throw new Error('no such connection')
            // }
            const { db } = data!
            if (isEmpty(db)) {
                throw new Error('no db loaded')
            }
            const dbs: DatabaseItem[] = []
            for (let i = 0; i < db.length; i++) {
                dbs.push({
                    key: `${name}/${db[i].name}`,
                    label: db[i].name,
                    name: name,
                    keys: db[i].keys,
                    db: i,
                    type: ConnectionType.RedisDB,
                    isLeaf: false,
                })
            }
            this.databases[name] = dbs
        },

        /**
         * Close connection
         * @param {string} name
         * @returns {Promise<boolean>}  内部是异步调用，，所以返回值是异步的，所有Promise的值都需要使用 await 获取返回值
         */
        async closeConnection(name: string): Promise<boolean> {
            const { success, msg } = await CloseConnection(name)
            if (!success) {
                // throw new Error(msg)
                return false
            }

            delete this.databases[name]
            const tabStore = useTabStore()
            tabStore.removeTabByName(name)
            return true
        },

        /**
         * Close all connection
         * @returns {Promise<void>}
         */
        async closeAllConnection() {
            for (const name in this.databases) {
                await CloseConnection(name)
            }

            this.databases = {}
            const tabStore = useTabStore()
            tabStore.removeAllTab()
        },

        /**
         * Remove connection
         * @param name
         * @returns {Promise<{success: boolean, [msg]: string}>}
         */
        async removeConnection(name: string):Promise<types.JSResp> {
            // close connection first
            await this.closeConnection(name)
            const { success, msg } = await RemoveConnection(name)
            if (!success) {
                return { success: false, msg }
            }
            await this.initConnections(true)
            return {data: undefined, msg: "", success: true }
        },

        /**
         * Create connection group
         * @param name
         * @returns {Promise<{success: boolean, [msg]: string}>}
         */
        async createGroup(name: string): Promise<{success: boolean, msg: string}> {
            const { success, msg } = await CreateGroup(name)
            if (!success) {
                return { success: false, msg }
            }
            await this.initConnections(true)
            return { success: true, msg: "" }
        },

        /**
         * Rename connection group
         * @param name
         * @param newName
         * @returns {Promise<{success: boolean, [msg]: string}>}
         */
        async renameGroup(name: string, newName: string) :Promise<{success: boolean, msg: string}> {
            if (name === newName) {
                return { success: true, msg: "" }
            }
            const { success, msg } = await RenameGroup(name, newName)
            if (!success) {
                return { success: false, msg }
            }
            await this.initConnections(true)
            return { success: true, msg: "" }
        },

        /**
         * Remove group by name
         * @param {string} name
         * @param {boolean} [includeConn]
         * @returns {Promise<{success: boolean, [msg]: string}>}
         */
        async deleteGroup(name:string, includeConn:boolean):Promise<{success: boolean, msg: string}> {
            const { success, msg } = await RemoveGroup(name, includeConn)
            if (!success) {
                return { success: false, msg }
            }
            await this.initConnections(true)
            return { success: true, msg: "" }
        },

        /**
         * Open database and load all keys
         * @param connName
         * @param db
         * @returns {Promise<void>}
         */
        async openDatabase(connName: string, db: number): Promise<void> {
            const { data, success, msg } = await OpenDatabase(connName, db) as OpenDatabaseResponse
            if (!success) {
                throw new Error(msg)
            }
            const { keys = [] } = data!
            if (isEmpty(keys)) {
                const dbs = this.databases[connName]
                dbs[db].children = []
                dbs[db].opened = true
                return
            }

            // insert child to children list by order
            const sortedInsertChild = (childrenList: DatabaseItem[], item: DatabaseItem) => {
                const insertIdx = sortedIndexBy(childrenList, item, 'key')
                childrenList.splice(insertIdx, 0, item)
                // childrenList.push(item)
            }
            // update all node item's children num
            const updateChildrenNum = (node: DatabaseItem) => {
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

            const keyStruct: DatabaseItem[] = []
            const mark: Record<string, DatabaseItem> = {}
            for (const key in keys) {
                const keyPart = split(key, separator)
                // const prefixLen = size(keyPart) - 1
                const len = size(keyPart)
                let handlePath = ''
                let ks: DatabaseItem[] = keyStruct
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
            const dbs = this.databases[connName]
            dbs[db].children = keyStruct
            dbs[db].opened = true
            updateChildrenNum(dbs[db])
        },

        /**
         * select node
         * @param key
         * @param name
         * @param db
         * @param type
         * @param redisKey
         */
        select({ key, name, db, type, redisKey }: SelectParams): void {
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
                const { data, success, msg } = await GetKeyValue(server, db, key) as GetKeyValueResponse
                if (success) {
                    const { type, ttl, value } = data!
                    const tab = useTabStore()
                    tab.upsertTab({
                        server,
                        db,
                        type,
                        ttl,
                        key,
                        value,
                    })
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
        _addKey(connName: string, db: number, key: string): void {
            const dbs = this.databases[connName]
            const dbDetail = get(dbs, db, {})

            if (dbDetail == null) {
                return
            }

            const descendantChain: DatabaseItem[] = [dbDetail as DatabaseItem]

            const keyPart = split(key, separator)
            let redisKey = ''
            const keyLen = size(keyPart)
            let added = false
            for (let i = 0; i < keyLen; i++) {
                redisKey += keyPart[i]

                const node = last(descendantChain)!
                const nodeList = get(node, 'children', []) as DatabaseItem[]
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
                            const item: DatabaseItem = {
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
                            const item: DatabaseItem = {
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
                    const children = get(descendantChain[i], 'children', []) as DatabaseItem[]
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
         * @param {string} keyType
         * @param {any} value
         * @param {number} ttl
         * @returns {Promise<{[msg]: string, success: boolean}>}
         */
        async setKey(connName: string, db: number, key: string, keyType: string, value: any, ttl: number): Promise<{msg?: string, success: boolean}> {
            try {
                const { data, success, msg } = await SetKeyValue(connName, db, key, keyType, value, ttl)
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
         * @returns {Promise<{[msg]: string, success: boolean, [updated]: {}}>}
         */
        async setHash(connName: string, db: number, key: string, field: string, newField: string | null, value: string | null): Promise<{msg?: string, success: boolean, updated?: Record<string, any>}> {
            try {
                const { data, success, msg } = await SetHashValue(connName, db, key, field, newField || '', value || '') as SetHashValueResponse
                if (success) {
                    const { updated = {} } = data!
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
         * @returns {Promise<{[msg]: string, success: boolean, [updated]: {}}>}
         */
        async addHashField(connName: string, db: number, key: string, action: number, fieldItems: string[]): Promise<{msg?: string, success: boolean, updated?: Record<string, any>}> {
            try {
                const { data, success, msg } = await AddHashField(connName, db, key, action, fieldItems) as AddHashFieldResponse
                if (success) {
                    const { updated = {} } = data!
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
         * @returns {Promise<{[msg]: {}, success: boolean, [removed]: string[]}>}
         */
        async removeHashField(connName: string, db: number, key: string, field: string): Promise<{msg?: string, success: boolean, removed?: string[]}> {
            try {
                const { data, success, msg } = await SetHashValue(connName, db, key, field, '', '') as SetHashValueResponse
                if (success) {
                    const { removed = [] } = data!
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
         * @returns {Promise<*|{msg, success: boolean}>}
         */
        async addListItem(connName: string, db: number, key: string, action: number, values: string[]): Promise<{msg?: string, success: boolean}> {
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
         * @returns {Promise<[msg]: string, success: boolean, [item]: []>}
         */
        async prependListItem(connName: string, db: number, key: string, values: string[]): Promise<{msg?: string, success: boolean, item?: any[]}> {
            try {
                const { data, success, msg } = await AddListItem(connName, db, key, 0, values) as AddListItemResponse
                if (success) {
                    const { left = [] } = data!
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
         * @returns {Promise<[msg]: string, success: boolean, [item]: any[]>}
         */
        async appendListItem(connName: string, db: number, key: string, values: string[]): Promise<{msg?: string, success: boolean, item?: any[]}> {
            try {
                const { data, success, msg } = await AddListItem(connName, db, key, 1, values) as AddListItemResponse
                if (success) {
                    const { right = [] } = data!
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
         * @returns {Promise<{[msg]: string, success: boolean, [updated]: {}}>}
         */
        async updateListItem(connName: string, db: number, key: string, index: number, value: string): Promise<{msg?: string, success: boolean, updated?: Record<string, any>}> {
            try {
                const { data, success, msg } = await SetListItem(connName, db, key, index, value) as SetListItemResponse
                if (success) {
                    const { updated = {} } = data!
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
         * @returns {Promise<{[msg]: string, success: boolean, [removed]: string[]}>}
         */
        async removeListItem(connName: string, db: number, key: string, index: number): Promise<{msg?: string, success: boolean, removed?: string[]}> {
            try {
                const { data, success, msg } = await SetListItem(connName, db, key, index, '') as SetListItemResponse
                if (success) {
                    const { removed = [] } = data!
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
         * @returns {Promise<{[msg]: string, success: boolean}>}
         */
        async addSetItem(connName: string, db: number, key: string, value: string): Promise<{msg?: string, success: boolean}> {
            try {
                const { success, msg } = await SetSetItem(connName, db, key, false, [value])
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
         * @returns {Promise<{[msg]: string, success: boolean}>}
         */
        async updateSetItem(connName: string, db: number, key: string, value: string, newValue: string): Promise<{msg?: string, success: boolean}> {
            try {
                const { success, msg } = await UpdateSetItem(connName, db, key, value, newValue)
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
         * @returns {Promise<{[msg]: string, success: boolean}>}
         */
        async removeSetItem(connName: string, db: number, key: string, value: string): Promise<{msg?: string, success: boolean}> {
            try {
                const { success, msg } = await SetSetItem(connName, db, key, true, [value])
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
         * @returns {Promise<{[msg]: string, success: boolean}>}
         */
        async addZSetItem(connName: string, db: number, key: string, action: number, vs: Record<string, number>): Promise<{msg?: string, success: boolean}> {
            try {
                const { success, msg } = await AddZSetValue(connName, db, key, action, vs)
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
         * @returns {Promise<{[msg]: string, success: boolean, [updated]: {}, [removed]: []}>}
         */
        async updateZSetItem(connName: string, db: number, key: string, value: string, newValue: string, score: number): Promise<{msg?: string, success: boolean, updated?: Record<string, any>, removed?: string[]}> {
            try {
                const { data, success, msg } = await UpdateZSetValue(connName, db, key, value, newValue, score) as UpdateZSetValueResponse
                if (success) {
                    const { updated, removed } = data!
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
         * @returns {Promise<{[msg]: string, success: boolean, [removed]: []}>}
         */
        async removeZSetItem(connName: string, db: number, key: string, value: string): Promise<{msg?: string, success: boolean, removed?: string[]}> {
            try {
                const { data, success, msg } = await UpdateZSetValue(connName, db, key, value, '', 0) as UpdateZSetValueResponse
                if (success) {
                    const { removed } = data!
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
         * @returns {Promise<boolean>}
         */
        async setTTL(connName: string, db: number, key: string, ttl: number): Promise<boolean> {
            try {
                const { success, msg } = await SetKeyTTL(connName, db, key, ttl)
                return success
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
        _removeKey(connName: string, db: number, key: string): void {
            const dbs = this.databases[connName]
            const dbDetail = get(dbs, db, {})

            if (dbDetail == null) {
                return
            }

            const descendantChain: DatabaseItem[] = [dbDetail as DatabaseItem]
            const keyPart = split(key, separator)
            let redisKey = ''
            const keyLen = size(keyPart)
            let deleted = false
            let forceBreak = false
            for (let i = 0; i < keyLen && !forceBreak; i++) {
                redisKey += keyPart[i]

                const node = last(descendantChain)!
                const nodeList = get(node, 'children', []) as DatabaseItem[]
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
                            node.keys -= 1
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
                    const children = get(descendantChain[i], 'children', []) as DatabaseItem[]
                    const parent = descendantChain[i - 1]
                    if (isEmpty(children)) {
                        const parentChildren = get(parent, 'children', []) as DatabaseItem[]
                        const k = get(descendantChain[i], 'key')
                        remove(parentChildren, (item) => item.key === k)
                    }
                    parent.keys -= 1
                }
            }
        },

        /**
         * remove redis key
         * @param {string} connName
         * @param {number} db
         * @param {string} key
         * @returns {Promise<boolean>}
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
         * @returns {Promise<{[msg]: string, success: boolean}>}
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