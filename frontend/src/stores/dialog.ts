import { defineStore } from 'pinia'

interface NewKeyParam {
    prefix: string
    server: string
    db: number
}

interface AddFieldParam {
    server: string
    db: number
    key: string
    type: string | null
}

interface RenameKeyParam {
    server: string
    db: number
    key: string
}

const useDialogStore = defineStore('dialog', {
    state: () => ({
        newDialogVisible: false,

        newKeyParam: {
            prefix: '',
            server: '',
            db: 0,
        } as NewKeyParam,

        newKeyDialogVisible: false,

        addFieldParam: {
            server: '',
            db: 0,
            key: '',
            type: null,
        } as AddFieldParam,

        addFieldsDialogVisible: false,

        renameKeyParam: {
            server: '',
            db: 0,
            key: '',
        }  as RenameKeyParam,

        renameDialogVisible: false,

        selectTTL: -1,
        ttlDialogVisible: false,

        preferencesDialogVisible: false,
    }),

    actions: {
        openNewDialog() {
            this.newDialogVisible = true
        },
        closeNewDialog() {
            this.newDialogVisible = false
        },

        openRenameKeyDialog(server: string, db: number, key: string) {
            this.renameKeyParam.server = server
            this.renameKeyParam.db = db
            this.renameKeyParam.key = key
            this.renameDialogVisible = true
        },
        closeRenameKeyDialog() {
            this.renameDialogVisible = false
        },

        openNewKeyDialog(prefix: string, server?: string, db?: number) {
            this.newKeyParam.prefix = prefix
            this.newKeyParam.server = server ?? ''
            this.newKeyParam.db = db ?? 0
            this.newKeyDialogVisible = true
        },
        closeNewKeyDialog() {
            this.newKeyDialogVisible = false
        },

        openAddFieldsDialog(server: string, db: number, key: string, type: string) {
            this.addFieldParam.server = server
            this.addFieldParam.db = db
            this.addFieldParam.key = key
            this.addFieldParam.type = type
            this.addFieldsDialogVisible = true
        },
        closeAddFieldsDialog() {
            this.addFieldsDialogVisible = false
        },

        openTTLDialog(ttl: number) {
            this.selectTTL = ttl
            this.ttlDialogVisible = true
        },
        closeTTLDialog() {
            this.selectTTL = -1
            this.ttlDialogVisible = false
        },

        openPreferencesDialog() {
            this.preferencesDialogVisible = true
        },
        closePreferencesDialog() {
            this.preferencesDialogVisible = false
        },
    },
})

export default useDialogStore
