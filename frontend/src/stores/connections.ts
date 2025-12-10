import { defineStore } from 'pinia'
import { endsWith, findIndex, get, isEmpty, size, split, uniq } from 'lodash'
import {
    AddHashField,
    AddListItem,
    AddZSetValue,
    CloseConnection,
    CreateGroup,
    DeleteConnection,
    DeleteGroup,
    DeleteKey,
    GetConnection,
    GetKeyValue,
    ListConnection,
    OpenConnection,
    OpenDatabase,
    RenameKey,
    RenameGroup,
    SaveConnection,
    SaveSortedConnection,
    ScanKeys,
    ServerInfo,
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
import {types} from "../../wailsjs/go/models";
import {ConnectionItem} from '../config/dbs'
import key from "../components/icons/Key.vue";

const separator = ':'

// 数据库 每个redis 默认 16个数据库
export interface DatabaseItem {
    key: string
    label: string
    name?: string
    type: number
    db?: number
    keys: number
    opened?: boolean
    expanded?: boolean
    children?: DatabaseItem[]
    redisKey?: string
    isLeaf?: boolean
}

interface ConnectionGroup extends ConnectionItem{
    Type: string
}

interface ListConnectionResponse {
    data?: ConnectionGroup[]
}


interface KeyItem {
    Type: string
}

interface OpenDatabaseResponse extends Record<string, KeyItem> {}

interface ScanKeysItem {
    keys: string[]
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
    serverStats: Record<string, string>,
    databases: Record<string, DatabaseItem[]>
    nodeMap: Record<string, any>, // all node in opened connections group by server+db and key+type
}

interface SelectParams {
    key: string
    name: string
    db: number
    type: number
    redisKey: string
}

const useConnectionStore = defineStore('connections', {
    /**
     *
     * @returns {{groups: string[], databases: Object<string, DatabaseItem[]>, connections: ConnectionItem[]}}
     */
    state: (): ConnectionState => ({
        groups: [], // all group name set
        connections: [], // all connections
        serverStats: {}, // current server status info
        databases: {}, // all databases in opened connections group by server name
        nodeMap: {}, // all node in opened connections group by server+db and key+type
    }),
    getters: {
        anyConnectionOpened(): boolean {
            console.log(this.databases)
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
                        label: conn.name,
                        type: ConnectionType.Server
                    })
                } else {
                    groups.push(conn.name)
                    // Custom group
                    const children: ConnectionItem[] = []
                    for (const item of conn.connections!) {
                        const value:string = conn.name + '/' + item.name

                        children.push({
                            group: "",
                            name: item.name,
                            key: value,
                            label: item.name,
                            type: ConnectionType.Server
                        })
                    }
                    conns.push({
                        group: "",
                        name: "",
                        key: conn.name,
                        label: conn.name,
                        type: ConnectionType.Group,
                        connections: children
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
        async getConnectionProfile(name:string):Promise<ConnectionItem> {
            try {
                const conns = await GetConnection(name)
                if (conns != null) {
                    return {name: conns.name, key: "", label: "", group: conns.group || "", addr: conns.addr, port: conns.port, username: conns.username, password: conns.password, defaultFilter: conns.defaultFilter, keySeparator: conns.keySeparator, connTimeout: conns.connTimeout, execTimeout: conns.execTimeout, markColor: conns.markColor}
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
        newDefaultConnection(name:string):ConnectionItem {
            return {
                key: "", label: "",
                group: '',
                name: name,
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
                if (conns[i].type === ConnectionType.Server && conns[i].key === name) {
                    return conns[i]
                } else if (conns[i].type === ConnectionType.Group) {
                    const children = conns[i].connections || []
                    for (let j = 0; j < children.length; j++) {
                        if (children[j].type === ConnectionType.Server && conns[i].key === name) {
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
        async saveConnection(name:string, param:ConnectionItem):Promise<types.JSResp> {
            const { success, msg } = await SaveConnection(name, types.Connection.createFrom(param))
            if (!success) {
                console.error(msg)
                return { success: false, msg }
            }

            // reload connection list
            await this.initConnections(true)
            return {data: undefined, msg: "save connection success", success: true }
        },

        /**
         * save connection after sort
         * @returns {Promise<void>}
         */
        async saveConnectionSorted(): Promise<void> {
            const mapToList = (conns: ConnectionItem[]):types.Connection[] => {
                const list: types.Connection[] = []
                for (const conn of conns) {
                    if (conn.type === ConnectionType.Group) {
                        const children = mapToList(conn.connections!)
                        list.push({
                            group: "", convertValues(a: any, classs: any, asMap?: boolean): any {
                            },
                            name: conn.label,
                            type: 'group',
                            connections: children
                        })
                    } else if (conn.type === ConnectionType.Server) {
                        list.push({
                            group: "", convertValues(a: any, classs: any, asMap?: boolean): any {
                            },
                            name: conn.name
                        })
                    }
                }
                return list
            }
            const s = mapToList(this.connections)
            await SaveSortedConnection(s)
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
         * @param reload
         * @returns {Promise<void>}
         */
        async openConnection(name: string, reload: boolean): Promise<void> {
            if (this.isConnected(name)) {
                if (!reload) {
                    return
                } else {
                    // reload mode, try close connection first
                    await CloseConnection(name)
                }
            }


            const cdbs = await OpenConnection(name)
            if (cdbs == null || cdbs.length === 0) {
                throw new Error('no db loaded')
            }
            // append to db node to current connection
            // const connNode = this.getConnection(name)
            // if (connNode == null) {
            //     throw new Error('no such connection')
            // }
            const dbs: DatabaseItem[] = []
            for (let i = 0; i < cdbs.length; i++) {
                dbs.push({
                    key: `${name}/${cdbs[i].name}`,
                    label: cdbs[i].name,
                    name: name,
                    keys: cdbs[i].keys,
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
            const success = await CloseConnection(name)
            if (!success) {
                // throw new Error(msg)
                return false
            }
            const dbs = this.databases[name]
            for (const db of dbs) {
                this.nodeMap[`${db.name}#${db.db}`]?.clear()
            }
            delete this.databases[name]
            delete this.serverStats[name]
            const tabStore = useTabStore()
            tabStore.removeTabByName(name)
            return true
        },

        /**
         * Close all connections
         * @returns {Promise<void>}
         */
        async closeAllConnection(): Promise<void> {
            for (const name in this.databases) {
                await CloseConnection(name)
            }

            this.databases = {}
            this.serverStats = {}
            const tabStore = useTabStore()
            tabStore.removeAllTab()
        },

        /**
         * Remove connection
         * @param name
         * @returns {Promise<{success: boolean, [msg]: string}>}
         */
        async deleteConnection(name: string):Promise<types.JSResp> {
            // close connection first
            await this.closeConnection(name)
            const { success, msg } = await DeleteConnection(name)
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
            const { success, msg } = await DeleteGroup(name, includeConn)
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
            const { data, success, msg } = await OpenDatabase(connName, db)
            if (!success) {
                throw new Error(msg)
            }
            const keys = (data as ScanKeysItem).keys
            const dbs = this.databases[connName]
            dbs[db].opened = true
            if (isEmpty(keys)) {
                dbs[db].children = []
                return
            }

            // append db node to current connection's children
            this._addKeyNodes(connName, db, keys)
            this._tidyNodeChildren(dbs[db])
        },
        /**
         * reopen database
         * @param connName connection name
         * @param db database index
         * @returns {Promise<void>}
         */
        async reopenDatabase(connName: string, db: number): Promise<void> {
            const dbs = this.databases[connName]
            dbs[db].children = undefined
            dbs[db].isLeaf = false
            this.nodeMap[`${connName}#${db}`]?.clear()
        },

        /**
         *
         * @param server
         * @returns {Promise<{}>}
         */
        async getServerInfo(server: string): Promise<Record<string,  string>> {
            // 获取 server info 信息
            try {
                const { success, data } = await ServerInfo(server)
                if (success) {
                    this.serverStats[server] = data
                    return data
                }
            } finally {
            }
            return {}
        },

        /**
         * load redis key
         * * @param {string} server
         *          * @param {number} db
         *          * @param {string} [key] when key is null or blank, update tab to display normal content (blank content or server status)
         *          */
        async loadKeyValue(server: string, db: number, key: string): Promise<void> {
            try {
                const tab = useTabStore()

                if (!isEmpty(key)) {
                    const data = await GetKeyValue(server, db, key)
                    if (data) {
                        const { type, ttl, value } = data!
                        tab.upsertTab({
                            blank: false, name: "",
                            server,
                            db,
                            type,
                            ttl,
                            key,
                            value
                        })
                        return
                    }
                }
                //  请求失败插入空数据
                tab.upsertTab({
                    blank: false, name: "",
                    server,
                    db,
                    type: 'none',
                    ttl: -1,
                    key,
                    value: null
                })
            } finally {
            }
        },

        /**
         * scan keys with prefix
         * @param {string} connName
         * @param {number} db
         * @param {string} [prefix] full reload database if prefix is null
         * @returns {Promise<{keys: string[]}>}
         */
        async scanKeys(connName: string, db: number, prefix: string):Promise<{keys: string[], success: boolean}>{
            const { data, success, msg } = await ScanKeys(connName, db, prefix || '*')
            if (!success) {
                throw new Error(msg)
            }
            // data 是一个 Record<"keys", string[]> 类型的数据
            const keys = (data as ScanKeysItem).keys
            return { keys, success }
        },
        /**
         * load keys with prefix
         * @param {string} connName
         * @param {number} db
         * @param {string} prefix
         * @returns {Promise<void>}
         */
        async loadKeys(connName:string, db:number, prefix: string) {
            let scanPrefix = prefix
            if (isEmpty(scanPrefix)) {
                scanPrefix = '*'
            } else {
                if (!endsWith(prefix, separator + '*')) {
                    scanPrefix = prefix + separator + '*'
                }
            }
            const { keys, success } = await this.scanKeys(connName, db, scanPrefix)
            if (!success) {
                return
            }

            // remove current keys below prefix
            this._deleteKeyNodes(connName, db, prefix)
            this._addKeyNodes(connName, db, keys)
            this._tidyNodeChildren(this.databases[connName][db])
        },

        /**
         * remove key with prefix
         * @param {string} connName
         * @param {number} db
         * @param {string} prefix
         * @returns {boolean}
         * @private
         */
        _deleteKeyNodes(connName: string, db: number, prefix: string) {
            const dbs = this.databases[connName]
            let node = dbs[db]
            const prefixPart = split(prefix, separator)
            const partLen = size(prefixPart)
            for (let i = 0; i < partLen; i++) {
                let idx = findIndex(node.children, { label: prefixPart[i] })
                if (idx === -1) {
                    node = {} as DatabaseItem
                    break
                }
                if (i === partLen - 1) {
                    // remove last part from parent
                    node.children?.splice(idx, 1)
                    return true
                } else {
                    node = node.children?.[idx] ?? {} as DatabaseItem
                }
            }
            return false
        },

        /**
         * remove keys in db
         * @param {string} connName
         * @param {number} db
         * @param {string[]} keys
         * @private
         */
        _addKeyNodes(connName: string, db: number, keys: string[]) {
            const dbs = this.databases[connName]
            if (dbs[db].children == null) {
                dbs[db].children = []
            }
            if (this.nodeMap[`${connName}#${db}`] == null) {
                this.nodeMap[`${connName}#${db}`] = new Map()
            }
            // construct tree node list, the format of item key likes 'server/db#type/key'
            const nodeMap = this.nodeMap[`${connName}#${db}`]
            const rootChildren = dbs[db].children
            for (const key of keys) {
                const keyPart = split(key, separator)
                // const prefixLen = size(keyPart) - 1
                const len = size(keyPart)
                const lastIdx = len - 1
                let handlePath = ''
                let children = rootChildren
                for (let i = 0; i < len; i++) {
                    handlePath += keyPart[i]
                    if (i !== lastIdx) {
                        // layer
                        const nodeKey = `#${ConnectionType.RedisKey}/${handlePath}`
                        let selectedNode = nodeMap.get(nodeKey)
                        if (selectedNode == null) {
                            selectedNode = {
                                key: `${connName}/db${db}${nodeKey}`,
                                label: keyPart[i],
                                db,
                                keys: 0,
                                redisKey: handlePath,
                                type: ConnectionType.RedisKey,
                                isLeaf: false,
                                children: [],
                            }
                            nodeMap.set(nodeKey, selectedNode)
                            children?.push(selectedNode)
                        }
                        children = selectedNode.children
                        handlePath += separator
                    } else {
                        // key
                        const nodeKey = `#${ConnectionType.RedisValue}/${handlePath}`
                        const selectedNode = {
                            key: `${connName}/db${db}${nodeKey}`,
                            label: keyPart[i],
                            db,
                            keys: 0,
                            redisKey: handlePath,
                            type: ConnectionType.RedisValue,
                            isLeaf: true,
                        }
                        nodeMap.set(nodeKey, selectedNode)
                        children?.push(selectedNode)
                    }
                }
            }
        },

        /**
         *
         * @param {DatabaseItem[]} nodeList
         * @private
         */
        _sortNodes(nodeList: DatabaseItem[]) {
            if (nodeList == null) {
                return
            }
            nodeList.sort((a, b) => {
                return a.key > b.key ? 1 : -1
            })
        },

        /**
         * sort all node item's children and calculate keys count
         * @param node
         * @private
         */
        _tidyNodeChildren(node: DatabaseItem) {
            let count = 0
            const totalChildren = size(node.children)
            if (!isEmpty(node.children)) {
                this._sortNodes(node.children!)

                for (const elem of node.children?.values() ?? []) {
                    this._tidyNodeChildren(elem)
                    count += elem.keys
                }
            } else {
                count += 1
            }
            node.keys = count
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
                    // this._addKey(connName, db, key)
                    this._addKeyNodes(connName, db, [key])
                    this._tidyNodeChildren(this.databases[connName][db])
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
        _deleteKeyNode(connName: string, db: number, key: string): void {
            const dbs = this.databases[connName]
            const dbDetail = get(dbs, db, {})

            if (dbDetail == null) {
                return
            }

            const nodeMap = this.nodeMap[`${connName}#${db}`]
            if (nodeMap == null) {
                return
            }
            const idx = key.lastIndexOf(separator)
            let parentNode = null
            let parentKey = ''
            if (idx === -1) {
                // root
                parentNode = dbDetail
            } else {
                parentKey = key.substring(0, idx)
                parentNode = nodeMap.get(`#${ConnectionType.RedisKey}/${parentKey}`)
            }

            if (parentNode == null || parentNode.children == null) {
                return
            }

            // remove children
            const delIdx = findIndex(parentNode.children, { redisKey: key })
            if (delIdx !== -1) {
                const childKeys = parentNode.children[delIdx].keys || 1
                parentNode.children.splice(delIdx, 1)
                parentNode.keys = Math.max(parentNode.keys - childKeys, 0)
            }

            // also remove parent node if no more children
            while (isEmpty(parentNode.children)) {
                const idx = parentKey.lastIndexOf(separator)
                if (idx !== -1) {
                    parentKey = parentKey.substring(0, idx)
                    parentNode = nodeMap.get(`#${ConnectionType.RedisKey}/${parentKey}`)
                    if (parentNode != null) {
                        parentNode.keys = (parentNode.keys || 1) - 1
                        parentNode.children = []
                    }
                } else {
                    // reach root, remove from db
                    // 假设 dbDetail: DatabaseItem | null | undefined
                    if (!dbDetail || !Array.isArray((dbDetail as DatabaseItem)?.children)) {
                        // 防御性处理：无效数据直接返回
                        return;
                    }
                    // 查找索引（使用类型安全的 findIndex）
                    const delIdx = (dbDetail as DatabaseItem)?.children?.findIndex(child => child.redisKey === parentKey);
                    if (delIdx === -1 || delIdx === undefined) {
                        // 没找到，不操作
                        return;
                    }
                    // 安全更新 keys（默认值为 1，但通常 keys 应 >=0）
                    (dbDetail as DatabaseItem).keys = Math.max(0, ((dbDetail as DatabaseItem).keys ?? 1) - 1);
                    // 删除元素
                    (dbDetail as DatabaseItem).children?.splice(delIdx, 1);
                    break
                }
            }
        },

        /**
         * delete redis key
         * @param {string} connName
         * @param {number} db
         * @param {string} key
         * @returns {Promise<boolean>}
         */
        async deleteKey(connName: string, db: number, key: string): Promise<boolean> {
            try {
                const { data, success, msg } = await DeleteKey(connName, db, key)
                if (success) {
                    // update tree view data
                    this._deleteKeyNode(connName, db, key)

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
         * delete keys with prefix
         * @param connName
         * @param db
         * @param prefix
         * @param keys
         * @returns {Promise<boolean>}
         */
        async deleteKeyPrefix(connName: string, db: number, prefix: string) {
            if (isEmpty(prefix)) {
                return false
            }
            try {
                const { data, success, msg } = await DeleteKey(connName, db, prefix)
                if (success) {
                    // const { deleted: keys = [] } = data
                    // for (const key of keys) {
                    //     await this._deleteKeyNode(connName, db, key)
                    // }
                    if (endsWith(prefix, '*')) {
                        prefix = prefix.substring(0, prefix.length - 1)
                    }
                    if (endsWith(prefix, separator)) {
                        prefix = prefix.substring(0, prefix.length - 1)
                    }
                    this._deleteKeyNode(connName, db, prefix)
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
                this._deleteKeyNode(connName, db, key)
                this._addKeyNodes(connName, db, [newKey])
                return { success: true }
            } else {
                return { success: false, msg }
            }
        },
    },
})

export default useConnectionStore