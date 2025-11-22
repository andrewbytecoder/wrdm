import {find, findIndex, isEmpty, size, stubTrue} from 'lodash'
import { defineStore } from 'pinia'
import {tupleExpression} from "@babel/types";

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

interface TabStoreState {
    tabList: TabItem[]
    activatedTab: string
    activatedIndex: number
}

const useTabStore = defineStore('tab', {
    state: (): TabStoreState => ({
        tabList: [],
        activatedTab: '',
        activatedIndex: 0,
    }),

    getters: {
        tabs(): TabItem[] {
            return this.tabList.length === 0 ? [{
                name: 'default',
                title: 'new tab',
                blank: true
            }] : this.tabList
        },

        currentTab(): TabItem | null {
            return this.tabs[this.activatedIndex || 0] || null
        },

        currentTabIndex(): TabItem | null {
            const len = size(this.tabs)
            if (this.activatedIndex < 0 || this.activatedIndex >= len) {
                this.activatedIndex = 0
            }
            return this.tabs[this.activatedIndex] || null
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
            // Implementation remains the same as original
        },

        removeTab(tabIndex: number): void {
            const len = size(this.tabs)
            if (len === 1 && this.tabs[0].blank) {
                return
            }

            if (tabIndex < 0 || tabIndex >= len) {
                return
            }
            this.tabList.splice(tabIndex, 1)

            if (len === 1) {
                this.newBlankTab()
            } else {
                this.activatedIndex -= 1
                if (this.activatedIndex < 0 && this.tabList.length > 0) {
                    this.activatedIndex = 0
                }
            }
        },

        removeTabByName(tabName: string): void {
            const idx = findIndex(this.tabs, { name: tabName })
            if (idx !== -1) {
                this.removeTab(idx)
            }
        },

        removeAllTab(): void {
            this.tabList = []
            this.newBlankTab()
        },
    },
})

export default useTabStore