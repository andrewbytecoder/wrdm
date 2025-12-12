import {find, findIndex, get, size} from 'lodash'
import { defineStore } from 'pinia'

export interface TabItem {
    name: string
    blank: boolean
    title?: string
    icon?: string
    type: string
    value?: any  // 类型不同返回的数据类型也可能不同
    server: string
    db: number
    key: string
    ttl?: number
}

// 界面上tab状态栏目
interface TabStoreState {
    tabList: TabItem[]
    activatedTab: string
    activatedIndex: number
    nav: string
    asideWidth: number
}

const useTabStore = defineStore('tab', {
    /**
     *
     * @returns {{tabList: TabItem[], activatedTab: string, activatedIndex: number}}
     */
    state: (): TabStoreState => ({
        nav: 'server',
        asideWidth: 300,
        tabList: [],
        activatedTab: '',
        activatedIndex: 0,
    }),

    getters: {
        tabs(): TabItem[] {
            return this.tabList
        },

        currentTab(): TabItem {
            return get(this.tabs, this.activatedIndex)
        },
    },


    actions: {
        newBlankTab(): void {
            this.tabList.push({
                db: 0,
                key: '',
                type: '',
                server: '',
                name: Date.now().toString(),
                title: 'new tab',
                blank: true
            })
            this._setActivatedIndex(size(this.tabList) - 1,false)
        },

        /**
         * @param {number} idx
         * @param {boolean} [switchNav]
         * @private
         */
        _setActivatedIndex(idx: number, switchNav: boolean): void {
            this.activatedIndex = idx
            if (switchNav) {
                this.nav = idx >= 0 ? 'browser' : 'server'
            } else {
                if (idx < 0) {
                    this.nav = 'server'
                }
            }
        },

        upsertTab({ server, db, type, ttl, key, value }: TabItem): void {
            let tabIndex = findIndex(this.tabList, { name: server })
            //  找不到新增
            if (tabIndex === -1) {
                this.tabList.push({
                    name: server,
                    server,
                    db,
                    blank: false,
                    type,
                    ttl,
                    key,
                    value
                })
                tabIndex = this.tabList.length - 1
            }
            //  找到了修改原先的值
            this.tabList[tabIndex].blank = false
            this.tabList[tabIndex].title = server
            this.tabList[tabIndex].server = server
            this.tabList[tabIndex].db = db
            this.tabList[tabIndex].type = type
            this.tabList[tabIndex].ttl = ttl
            this.tabList[tabIndex].key = key
            this.tabList[tabIndex].value = value
            this._setActivatedIndex(tabIndex, true)
        },

        updateTTL({ server, db, key, ttl }: {
            server: string
            db: number
            key: string
            ttl: number
        }): void {
            const tab = find(this.tabList, { name: server, db, key })
            if (tab == null) {
                return
            }
            tab.ttl = ttl
        },

        emptyTab(name: string): void {
            const tab = find(this.tabList, { name })
            if (tab != null) {
                tab.key = null as any
                tab.value = null
            }
        },

        switchTab(tabIndex: number): void {
            // const len = size(this.tabList)
            // if (tabIndex < 0 || tabIndex >= len) {
            //     return
            // }
            // // 使用内部方法以统一 nav 的设置
            // this._setActivatedIndex(tabIndex, true)
        },

        removeTab(tabIndex: number): null | TabItem {
            const len = size(this.tabs)
            if (len === 1 && this.tabs[0].blank) {
                return null
            }

            if (tabIndex < 0 || tabIndex >= len) {
                return null
            }

            const removed = this.tabList.splice(tabIndex, 1)

            // update select index if removed index equal current selected
            this.activatedIndex -= 1
            if (this.activatedIndex < 0) {
                if (this.tabList.length > 0) {
                    this._setActivatedIndex(0, false)
                } else {
                    this._setActivatedIndex(-1, false)
                }
            } else {
                this._setActivatedIndex(this.activatedIndex, false)
            }

            return size(removed) > 0 ? removed[0] : null
        },

        removeTabByName(tabName: string): void {
            const idx = findIndex(this.tabs, { name: tabName })
            if (idx !== -1) {
                this.removeTab(idx)
            }
        },

        removeAllTab(): void {
            this.tabList = []
            this._setActivatedIndex(-1, false)
        },
    },
})

export default useTabStore