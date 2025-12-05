import { defineStore } from 'pinia'
import useConnectionStore from './connections.js'
import {ConnParam, ConnectionItem} from '../config/dbs';

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

        preferencesDialogVisible: false,
    }),

    actions: {
        openNewDialog() {
            this.connDialogVisible = true
            this.connParam = new ConnParam('', '', '', '', '127.0.0.1', 6379,
                '', '', '*', ':', 60, 60, '', 0)
        },
        closeNewDialog() {
            this.connDialogVisible = false
        },

        async openEditDialog(name: string) {
            console.log('open edit dialog:' + name)
            const connStore = useConnectionStore()
            let profile = await connStore.getConnectionProfile(name)
            if (!profile) {
                profile = connStore.newDefaultConnection(name)
                return
            }
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
