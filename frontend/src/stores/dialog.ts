import { defineStore } from 'pinia'
import useConnectionStore from '@/stores/connections'
import { ConnParam, ConnectionItem } from '@/config/dbs'

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

interface DeleteKeyParam {
    server: string
    db: number
    key: string
}

interface KeyFilterParam {
    server: string
    db: number
    type: string
    pattern: string
}

interface LeaseParam {
    server: string
    key: string
    leaseId: number
}

interface ExportParam {
    server: string
    prefix: string
}

interface ImportParam {
    server: string
    json: string
    mode: 'overwrite' | 'skip' | 'onlyNew'
}

interface TxnParam {
    server: string
    json: string
}
const useDialogStore = defineStore('dialog', {
    state: () => ({
        connDialogVisible: false,
        connParam: {} as ConnectionItem,

        groupDialogVisible: false,
        editGroup: '',

        newKeyParam: {
            prefix: '',
            server: '',
            db: 0,
        } as NewKeyParam,

        newKeyDialogVisible: false,

        keyFilterParam: {
            server: '',
            db: 0,
            type: '',
            pattern: '*',
        } as KeyFilterParam,

        keyFilterDialogVisible: false,

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

        deleteKeyParam: {
            server: '',
            db: 0,
            key: '',
        } as DeleteKeyParam,
        deleteKeyDialogVisible: false,

        selectTTL: -1,
        ttlDialogVisible: false,

        leaseParam: {
            server: '',
            key: '',
            leaseId: 0,
        } as LeaseParam,
        leaseDialogVisible: false,

        exportParam: {
            server: '',
            prefix: '',
        } as ExportParam,
        exportDialogVisible: false,

        importParam: {
            server: '',
            json: '[]',
            mode: 'onlyNew',
        } as ImportParam,
        importDialogVisible: false,

        txnParam: {
            server: '',
            json: JSON.stringify({ compares: [], successOps: [], failOps: [] }, null, 2),
        } as TxnParam,
        txnDialogVisible: false,

        preferencesDialogVisible: false,
    }),

    actions: {
        openNewDialog() {
            this.connDialogVisible = true
            this.connParam = new ConnParam('', '', '', '', '127.0.0.1', 2379,
                '', '', '', '/', 60, 60, '', 0)
        },
        closeNewDialog() {
            this.connDialogVisible = false
        },

        async openEditDialog(name: string) {
            const connStore = useConnectionStore()
            let profile = await connStore.getConnectionProfile(name)
            if (!profile) return
            this.connParam = new ConnParam(profile.name, profile.group, "", "",profile.addr,
                profile.port, profile.username, profile.password, profile.defaultFilter, profile.keySeparator,
                profile.connTimeout, profile.execTimeout, profile.markColor, profile.type)
            this.connDialogVisible = true
        },
        closeEditDialog() {
            this.connDialogVisible = false
        },

        openNewGroupDialog() {
            this.groupDialogVisible = true
        },
        closeNewGroupDialog() {
            this.groupDialogVisible = false
        },
        /**
         *
         * @param {string} server
         * @param {number} db
         * @param {string} pattern
         * @param {string} type
         */
        openKeyFilterDialog(server: string, db: number, pattern: string, type: string) {
            this.keyFilterParam.server = server
            this.keyFilterParam.db = db
            this.keyFilterParam.type = type || ''
            this.keyFilterParam.pattern = pattern || '*'
            this.keyFilterDialogVisible = true
        },
        closeKeyFilterDialog() {
            this.keyFilterDialogVisible = false
        },

        /**
         *
         * @param {string} name
         */
        openRenameGroupDialog(name: string) {
            this.editGroup = name
            this.groupDialogVisible = true
        },
        closeRenameGroupDialog() {
            this.groupDialogVisible = false
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
        openDeleteKeyDialog(server: string, db: number, key: string) {
            this.deleteKeyParam.server = server
            this.deleteKeyParam.db = db
            this.deleteKeyParam.key = key
            this.deleteKeyDialogVisible = true
        },
        closeDeleteKeyDialog() {
            this.deleteKeyDialogVisible = false
        },

        openLeaseDialog(server: string, key: string, leaseId: number) {
            this.leaseParam = { server, key, leaseId }
            this.leaseDialogVisible = true
        },

        closeLeaseDialog() {
            this.leaseDialogVisible = false
        },

        openExportDialog(server: string, prefix: string) {
            this.exportParam = { server, prefix }
            this.exportDialogVisible = true
        },

        closeExportDialog() {
            this.exportDialogVisible = false
        },

        openImportDialog(server: string, json: string, mode: 'overwrite' | 'skip' | 'onlyNew') {
            this.importParam = { server, json, mode }
            this.importDialogVisible = true
        },

        closeImportDialog() {
            this.importDialogVisible = false
        },

        openTxnDialog(server: string) {
            this.txnParam = { server, json: JSON.stringify({ compares: [], successOps: [], failOps: [] }, null, 2) }
            this.txnDialogVisible = true
        },

        closeTxnDialog() {
            this.txnDialogVisible = false
        },

        /**
         *
         * @param {string} prefix
         * @param {string} server
         * @param {number} db
         */
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
