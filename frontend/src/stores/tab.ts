import {find, findIndex, size} from 'lodash'
import { defineStore } from 'pinia'

export interface TabItem {
    name: string
    blank: boolean
    title?: string
    icon?: string
    type?: string
    value?: any
    server?: string
    db?: number
    key?: string
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

        currentTab(): TabItem | null {
            // 如果 activatedIndex 越界，优先返回第一个 tab（如果存在），否则返回 null
            const idx = (this.activatedIndex >= 0 && this.activatedIndex < this.tabs.length)
                ? this.activatedIndex
                : 0
            return this.tabs[idx] || null
        },

        currentTabIndex() : TabItem | null{
            const len = size(this.tabs)
            if (len === 0) return null

            if (this.activatedIndex < 0 || this.activatedIndex >= len) {
                this.activatedIndex = 0
            }

            const idx = (this.activatedIndex >= 0 && this.activatedIndex < len)
                ? this.activatedIndex
                : 0
            return this.tabs[idx] || null
        },
        // newBlankTab(): void {
        //     this.tabList.push({
        //         name: Date.now().toString(),
        //         title: 'new tab',
        //         blank: true,
        //     })
        //     this.activatedIndex = size(this.tabList) - 1
        // },

    },


    actions: {
        newBlankTab(): void {
            this.tabList.push({
                name: Date.now().toString(),
                title: 'new tab',
                blank: true,
            })
            this.activatedIndex = size(this.tabList) - 1
        },

        /**
         *
         * @param {number} idx
         * @param {boolean} [switchNav]
         * @private
         */
        _setActivatedIndex(idx: number, switchNav: boolean): void {
            this.activatedIndex = idx
            if (switchNav) {
                this.nav = idx >= 0 ? 'structure' : 'server'
            } else {
                if (idx < 0) {
                    this.nav = 'server'
                }
            }
        },

        upsertTab({ server, db, type, ttl, key, value }: {
            server: string
            db: number
            type?: string
            ttl?: number
            key?: string
            value?: any
        }): void {
            let tabIndex = findIndex(this.tabList, { name: server })
            if (tabIndex === -1) {
                this.tabList.push({
                    name: server,
                    server,
                    db,
                    blank: true,
                    type,
                    ttl,
                    key,
                    value
                })
                tabIndex = this.tabList.length - 1
            }
            const tab = this.tabList[tabIndex]
            tab.blank = false
            tab.title = `${server}/db${db}`
            tab.server = server
            tab.db = db
            tab.type = type
            tab.ttl = ttl
            tab.key = key
            tab.value = value
            this.activatedIndex = tabIndex
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
            const len = size(this.tabList)
            if (tabIndex < 0 || tabIndex >= len) {
                return
            }
            // 使用内部方法以统一 nav 的设置
            this._setActivatedIndex(tabIndex, true)
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
            const removedItem = size(removed) > 0 ? removed[0] : null

            if (this.tabList.length === 0) {
                // 如果已无 tab，创建一个空白 tab
                this.newBlankTab()
                this.activatedIndex = 0
            } else {
                // 根据删除位置调整 activatedIndex
                if (tabIndex < this.activatedIndex) {
                    // 删除在当前激活项左侧，索引左移一位
                    this.activatedIndex -= 1
                } else if (tabIndex === this.activatedIndex) {
                    // 删除的是当前激活项，选择删除后右侧的项（如果存在），否则选择最后一项
                    const newIndex = Math.min(tabIndex, this.tabList.length - 1)
                    this.activatedIndex = newIndex
                }
                // 如果删除在激活项右侧，不需要调整 activatedIndex
                if (this.activatedIndex < 0 && this.tabList.length > 0) {
                    this.activatedIndex = 0
                }
            }
            return removedItem
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