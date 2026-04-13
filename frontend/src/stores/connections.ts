import { defineStore } from 'pinia'
import { isEmpty, uniq } from 'lodash'
import { EventsOn } from '@wails/runtime'
import useTabStore from '@/stores/tab'
import {
  CloseConnection,
  CreateGroup,
  DeleteConnection,
  DeleteGroup,
  DeleteKey,
  ExportPrefix,
  GetConnection,
  GetKV,
  GrantLease,
  Import,
  KeepAliveLease,
  LeaseTimeToLive,
  ListConnection,
  ListKeys,
  OpenConnection,
  PutKV,
  RenameGroup,
  RenameKey,
  RevokeLease,
  SaveConnection,
  SaveSortedConnection,
  TestConnection,
  Txn,
  Unwatch,
  WatchPrefix,
} from '@wails/go/services/EtcdService'
import { types } from '@wails/go/models'

export interface ConnectionProfile {
  defaultFilter: string
  keySeparator: string
  markColor: string
}

export interface KVItem {
  key: string
  valueBase64: string
  createRevision: number
  modRevision: number
  version: number
  lease: number
}

export interface ListKeysResult {
  kvs: KVItem[]
  count: number
  more: boolean
  revision: number
}

export interface EtcdStatus {
  endpoint: string
  status: any
  members: any[]
}

export interface TxnCompare {
  key: string
  target: 'version' | 'modRevision' | 'value'
  op: '=' | '!=' | '>' | '<' | '>=' | '<='
  value: string
}

export interface TxnOp {
  type: 'put' | 'del' | 'get'
  key: string
  valueBase64?: string
  withPrefix?: boolean
  leaseId?: number
}

interface ConnectionState {
  groups: string[]
  connections: any[]
  serverProfile: Record<string, ConnectionProfile>
  opened: Record<string, boolean>
  status: Record<string, EtcdStatus>
  watchIds: Record<string, number> // key: `${server}#${prefix}`
  eventsInited: boolean
}

const DEFAULT_SEPARATOR = '/'

const useConnectionStore = defineStore('connections', {
  state: (): ConnectionState => ({
    groups: [],
    connections: [],
    serverProfile: {},
    opened: {},
    status: {},
    watchIds: {},
    eventsInited: false,
  }),

  getters: {
    anyConnectionOpened(): boolean {
      return !isEmpty(this.opened)
    },
  },

  actions: {
    initEtcdEvents(): void {
      if (this.eventsInited) return
      this.eventsInited = true
      const tabStore = useTabStore()
      EventsOn('etcd:watch', async (ev: any) => {
        try {
          const cur = tabStore.currentTab
          if (!cur || !cur.key || !cur.server) return
          if (ev?.type !== 'PUT') return
          if (ev?.key !== cur.key) return
          const kv = await this.getKV(cur.server, cur.key)
          tabStore.upsertTab({
            blank: false,
            name: cur.server,
            server: cur.server,
            db: 0,
            type: 'kv',
            ttl: -1,
            key: cur.key,
            value: kv,
          })
        } catch {
          // ignore
        }
      })
    },

    async ensureWatch(connName: string, prefix: string): Promise<number> {
      const k = `${connName}#${prefix}`
      if (this.watchIds[k]) return this.watchIds[k]
      const id = await this.watchPrefix(connName, prefix)
      this.watchIds[k] = id
      return id
    },

    async testConnection(host: string, port: number, username: string, password: string): Promise<types.JSResp> {
      return TestConnection(host, port, username, password)
    },

    async initConnections(force: boolean): Promise<void> {
      if (!force && !isEmpty(this.connections)) return

      const conns: any[] = []
      const groups: string[] = []
      const profiles: Record<string, ConnectionProfile> = {}

      const data: any[] = await ListConnection()
      for (const conn of data) {
        if (conn.type !== 'group') {
          conns.push({
            name: conn.name,
            key: conn.name,
            label: conn.name,
            type: 1,
          })
          profiles[conn.name] = {
            defaultFilter: conn.defaultFilter || '',
            keySeparator: conn.keySeparator || DEFAULT_SEPARATOR,
            markColor: conn.markColor || '',
          }
        } else {
          groups.push(conn.name)
          const children: any[] = []
          for (const item of conn.connections || []) {
            children.push({
              name: item.name,
              key: `${conn.name}/${item.name}`,
              label: item.name,
              type: 1,
            })
            profiles[item.name] = {
              defaultFilter: item.defaultFilter || '',
              keySeparator: item.keySeparator || DEFAULT_SEPARATOR,
              markColor: item.markColor || '',
            }
          }
          conns.push({
            name: '',
            key: conn.name,
            label: conn.name,
            type: 0,
            connections: children,
          })
          profiles[conn.name] = {
            defaultFilter: conn.defaultFilter || '',
            keySeparator: conn.keySeparator || DEFAULT_SEPARATOR,
            markColor: conn.markColor || '',
          }
        }
      }

      this.connections = conns
      this.groups = uniq(groups)
      this.serverProfile = profiles
    },

    async getConnectionProfile(name: string): Promise<any> {
      const conns = await GetConnection(name)
      return conns
    },

    async saveConnection(name: string, param: any): Promise<types.JSResp> {
      const { success, msg } = await SaveConnection(name, types.Connection.createFrom(param))
      if (!success) return { success: false, msg }
      await this.initConnections(true)
      return { success: true, msg: 'save connection success', data: undefined }
    },

    async saveConnectionSorted(): Promise<void> {
      await SaveSortedConnection(this.connections)
    },

    async createGroup(name: string): Promise<types.JSResp> {
      const resp = await CreateGroup(name)
      if (resp.success) await this.initConnections(true)
      return resp
    },

    async renameGroup(name: string, newName: string): Promise<types.JSResp> {
      const resp = await RenameGroup(name, newName)
      if (resp.success) await this.initConnections(true)
      return resp
    },

    async deleteGroup(name: string, includeConn: boolean): Promise<types.JSResp> {
      const resp = await DeleteGroup(name, includeConn)
      if (resp.success) await this.initConnections(true)
      return resp
    },

    async deleteConnection(name: string): Promise<types.JSResp> {
      await this.closeConnection(name)
      const resp = await DeleteConnection(name)
      if (resp.success) await this.initConnections(true)
      return resp
    },

    isConnected(name: string): boolean {
      return this.opened[name] === true
    },

    async openConnection(name: string, reload: boolean): Promise<void> {
      if (this.isConnected(name) && !reload) return
      if (this.isConnected(name) && reload) {
        await CloseConnection(name)
      }
      const { success, msg, data } = await OpenConnection(name)
      if (!success) throw new Error(msg)
      this.opened[name] = true
      this.status[name] = data as any
    },

    async closeConnection(name: string): Promise<boolean> {
      const ok = await CloseConnection(name)
      delete this.opened[name]
      delete this.status[name]
      return ok
    },

    async closeAllConnection(): Promise<void> {
      const names = Object.keys(this.opened)
      for (const n of names) {
        await CloseConnection(n)
      }
      this.opened = {}
      this.status = {}
    },

    async listKeys(connName: string, prefix: string, limit = 1000, rangeEnd = '', keysOnly = true): Promise<ListKeysResult> {
      const { success, msg, data } = await ListKeys(connName, prefix, limit, rangeEnd, keysOnly)
      if (!success) throw new Error(msg)
      return data as any
    },

    async getKV(connName: string, key: string): Promise<KVItem | null> {
      const { success, msg, data } = await GetKV(connName, key)
      if (!success) throw new Error(msg)
      return (data as any) || null
    },

    async putKV(connName: string, key: string, valueBase64: string, leaseID = 0): Promise<void> {
      const { success, msg } = await PutKV(connName, key, valueBase64, leaseID)
      if (!success) throw new Error(msg)
    },

    async deleteKey(connName: string, key: string, withPrefix: boolean): Promise<void> {
      const { success, msg } = await DeleteKey(connName, key, withPrefix)
      if (!success) throw new Error(msg)
    },

    async renameKey(connName: string, key: string, newKey: string, preserveLease: boolean): Promise<void> {
      const { success, msg } = await RenameKey(connName, key, newKey, preserveLease)
      if (!success) throw new Error(msg)
    },

    async watchPrefix(connName: string, prefix: string): Promise<number> {
      const { success, msg, data } = await WatchPrefix(connName, prefix)
      if (!success) throw new Error(msg)
      return (data as any).watchId as number
    },

    async unwatch(watchId: number): Promise<void> {
      await Unwatch(watchId)
    },

    async grantLease(connName: string, ttl: number): Promise<{ id: number; ttl: number }> {
      const { success, msg, data } = await GrantLease(connName, ttl)
      if (!success) throw new Error(msg)
      return data as any
    },

    async revokeLease(connName: string, leaseId: number): Promise<void> {
      const { success, msg } = await RevokeLease(connName, leaseId)
      if (!success) throw new Error(msg)
    },

    async keepAliveLease(connName: string, leaseId: number): Promise<void> {
      const { success, msg } = await KeepAliveLease(connName, leaseId)
      if (!success) throw new Error(msg)
    },

    async leaseTimeToLive(connName: string, leaseId: number, keys: boolean): Promise<any> {
      const { success, msg, data } = await LeaseTimeToLive(connName, leaseId, keys)
      if (!success) throw new Error(msg)
      return data
    },

    async txn(connName: string, compares: TxnCompare[], successOps: TxnOp[], failOps: TxnOp[]): Promise<any> {
      const { success, msg, data } = await Txn(connName, compares as any, successOps as any, failOps as any)
      if (!success) throw new Error(msg)
      return data
    },

    async exportPrefix(connName: string, prefix: string): Promise<{ json: string; count: number }> {
      const { success, msg, data } = await ExportPrefix(connName, prefix)
      if (!success) throw new Error(msg)
      return data as any
    },

    async importData(connName: string, json: string, mode: 'overwrite' | 'skip' | 'onlyNew'): Promise<{ imported: number }> {
      const { success, msg, data } = await Import(connName, json, mode)
      if (!success) throw new Error(msg)
      return data as any
    },
  },
})

export default useConnectionStore

