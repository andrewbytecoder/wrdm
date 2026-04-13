<script setup lang="ts">
import { useMessage, useThemeVars } from 'naive-ui'
import AddLink from '@/components/icons/AddLink.vue'
import BrowserTree from '@/components/sidebar/BrowserTree.vue'
import IconButton from '@/components/common/IconButton.vue'
import useTabStore from '@/stores/tab'
import { computed, reactive } from 'vue'
import { get } from 'lodash'
import Delete from '@/components/icons/Delete.vue'
import Refresh from '@/components/icons/Refresh.vue'
import Save from '@/components/icons/Save.vue'
import Copy from '@/components/icons/Copy.vue'
import Edit from '@/components/icons/Edit.vue'
import useDialogStore from '@/stores/dialog'
import { useI18n } from 'vue-i18n'
import useConnectionStore from '@/stores/connections'



const themeVars = useThemeVars()
const dialogStore = useDialogStore()
const tabStore = useTabStore()
const currentName = computed((): string => get(tabStore.currentTab, 'name', ''))

/**
 *
 * @type {ComputedRef<{server: string, db: number, key: string}>}
 */
const currentSelect = computed((): { server: string, db: number, key: string } => {
  const { server, db, key } = tabStore.currentTab
  return { server, db, key }
})

const onNewKey = () => {
  const { server, key, db = 0 } = currentSelect.value
  dialogStore.openNewKeyDialog(key ?? '', server ?? '', db)
}

const i18n = useI18n()
const connectionStore = useConnectionStore()
const message = useMessage()
const onDeleteKey = () => {
  const { server, key } = currentSelect.value
  if (!server || !key) return
  dialogStore.openDeleteKeyDialog(server, 0, key)
}

const onRefresh = () => {
  connectionStore.openConnection(currentSelect.value.server!, true).then(() => {
    message.success(i18n.t('reload_succ'))
  })
}

const onExport = () => {
  const { server, key } = currentSelect.value
  if (!server) return
  // export current key as prefix if it ends with '/'
  dialogStore.openExportDialog(server, key || '')
}

const onImport = () => {
  const { server } = currentSelect.value
  if (!server) return
  dialogStore.openImportDialog(server, '[]', 'onlyNew')
}

const onTxn = () => {
  const { server } = currentSelect.value
  if (!server) return
  dialogStore.openTxnDialog(server)
}

</script>

<template>
    <div class="nav-pane-container flex-box-v">
        <BrowserTree :server="currentName" />
        <!-- bottom function bar -->
        <div class="nav-pane-bottom flex-box-h">
            <icon-button :icon="AddLink" size="20" stroke-width="4" t-tooltip="new_key" @click="onNewKey" />
            <icon-button :icon="Refresh" size="20" stroke-width="4" t-tooltip="reload" @click="onRefresh" />
            <icon-button :icon="Save" size="20" stroke-width="4" t-tooltip="export" @click="onExport" />
            <icon-button :icon="Copy" size="20" stroke-width="4" t-tooltip="import" @click="onImport" />
            <icon-button :icon="Edit" size="20" stroke-width="4" t-tooltip="txn" @click="onTxn" />
            <div class="flex-item-expand"></div>
            <icon-button
                :disabled="currentSelect.key == null"
                :icon="Delete"
                size="20"
                stroke-width="4"
                t-tooltip="remove_key"
                @click="onDeleteKey"
            />
        </div>
    </div>
</template>

<style scoped lang="scss">
.nav-pane-bottom {
  color: v-bind('themeVars.iconColor');
  border-top: v-bind('themeVars.borderColor') 1px solid;
}
</style>
