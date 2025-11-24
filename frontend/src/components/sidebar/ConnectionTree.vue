<script setup lang="ts">
import useDialogStore from '../../stores/dialog'
import { h, nextTick, onMounted, reactive, ref } from 'vue'
import useConnectionStore,  { DatabaseItem } from '../../stores/connections'
import { NIcon, useDialog, useMessage, TreeOption } from 'naive-ui'
import { ConnectionType } from '../../consts/connection_type'
import ToggleFolder from '../icons/ToggleFolder.vue'
import ToggleServer from '../icons/ToggleServer.vue'
import { indexOf } from 'lodash'
import Config from '../icons/Config.vue'
import Delete from '../icons/Delete.vue'
import Unlink from '../icons/Unlink.vue'
import CopyLink from '../icons/CopyLink.vue'
import Connect from '../icons/Connect.vue'
import { useI18n } from 'vue-i18n'
import useTabStore from '../../stores/tab'
import Edit from '../icons/Edit.vue'

interface ContextMenuParam {
  show: boolean
  x: number
  y: number
  options: any[] | null
  currentNode: TreeOption | null
}

interface ExtendedTreeOption extends TreeOption {
  type: number
  name?: string
  db?: number
  key?: string
  redisKey?: string
}

const i18n = useI18n()
const loadingConnection = ref(false)
const openingConnection = ref(false)
const connectionStore = useConnectionStore()
const tabStore = useTabStore()
const dialogStore = useDialogStore()
const message = useMessage()

const expandedKeys = ref<string[]>([])
const selectedKeys = ref<string[]>([])

onMounted(async () => {
  try {
    loadingConnection.value = true
    await nextTick()
    await connectionStore.initConnections(false)
  } finally {
    loadingConnection.value = false
  }
})

const contextMenuParam = reactive<ContextMenuParam>({
  show: false,
  x: 0,
  y: 0,
  options: null,
  currentNode: null,
})

const renderIcon = (icon: any) => {
  return () => {
    return h(NIcon, null, {
      default: () => h(icon),
    })
  }
}

const menuOptions: Record<number, Function> = {
  [ConnectionType.Group]: () => [
    {
      key: 'group_reload',
      label: i18n.t('edit_conn_group'),
      icon: renderIcon(Config),
    },
    {
      key: 'group_delete',
      label: i18n.t('remove_conn_group'),
      icon: renderIcon(Delete),
    },
  ],
  [ConnectionType.Server]: ({ name }: DatabaseItem ) => {
    const connected = connectionStore.isConnected(name)
    if (connected) {
      return [
        {
          key: 'server_close',
          label: i18n.t('disconnect'),
          icon: renderIcon(Unlink),
        },
        {
          key: 'server_dup',
          label: i18n.t('dup_conn'),
          icon: renderIcon(CopyLink),
        },
        {
          key: 'server_config',
          label: i18n.t('edit_conn'),
          icon: renderIcon(Config),
        },
        {
          type: 'divider',
          key: 'd1',
        },
        {
          key: 'server_remove',
          label: i18n.t('remove_conn'),
          icon: renderIcon(Delete),
        },
      ]
    } else {
      return [
        {
          key: 'server_open',
          label: i18n.t('open_connection'),
          icon: renderIcon(Connect),
        },
        {
          key: 'server_edit',
          label: i18n.t('edit_conn'),
          icon: renderIcon(Edit),
        },
        {
          type: 'divider',
          key: 'd1',
        },
        {
          key: 'server_remove',
          label: i18n.t('remove_conn'),
          icon: renderIcon(Delete),
        },
      ]
    }
  },
}

const renderLabel = ({ option }: { option: TreeOption }) => {
  // switch (option.type) {
  //     case ConnectionType.Server:
  //         return h(ConnectionTreeItem, { title: option.label })
  // }
  return option.label
}

const renderPrefix = ({ option }: { option: ExtendedTreeOption }) => {
  switch (option.type) {
    case ConnectionType.Group:
      const opened = indexOf(expandedKeys.value, option.key) !== -1
      return h(
          NIcon,
          { size: 20 },
          {
            default: () => h(ToggleFolder, { modelValue: opened }),
          }
      )
    case ConnectionType.Server:
      const connected = connectionStore.isConnected(option.name!)
      return h(
          NIcon,
          { size: 20 },
          {
            default: () => h(ToggleServer, { modelValue: connected }),
          }
      )
    default:
      return null
  }
}

// const onUpdateExpandedKeys = (
//     value: string[],
//     option: TreeOption,
//     meta: { node: TreeOption; action: 'expand' | 'collapse' }
// ) => {
//   expandedKeys.value = value
// }

const onUpdateExpandedKeys = (keys: string[], option: TreeOption, meta: { node: TreeOption; action: 'expand' | 'collapse' }) => {
  expandedKeys.value = keys
}

const onUpdateSelectedKeys = (keys: string[], option: TreeOption, meta: { node: TreeOption; action: 'expand' | 'collapse' }) => {
  selectedKeys.value = keys
}

/**
 * Open connection
 * @param name
 */
const openConnection = async (name: string) => {
  try {
    if (!connectionStore.isConnected(name)) {
      openingConnection.value = true
      await connectionStore.openConnection(name)
    }
    tabStore.upsertTab({
      server: name,
      db: 0,
    })
  } catch (e: any) {
    message.error(e.message)
    // node.isLeaf = undefined
  } finally {
    openingConnection.value = false
  }
}


const dialog = useDialog()
const removeConnection = async (name: string) => {
  dialog.warning({
    title: i18n.t('warning'),
    content: i18n.t('delete_key_tip', { key: name }),
    closable: false,
    autoFocus: false,
    transformOrigin: 'center',
    positiveText: i18n.t('confirm'),
    negativeText: i18n.t('cancel'),
    onPositiveClick: async () => {
      connectionStore.removeConnection(name).then(({ success, msg }) => {
        if (!success) {
          message.error(msg)
        } else {
          message.success(i18n.t('delete_key_succ', { key: name }))
        }
      })
    },
  })
}


const nodeProps = ({ option }: { option: ExtendedTreeOption }) => {
  return {
    onDblclick: async () => {
      if (option.type === ConnectionType.Server) {
        openConnection(option.name!).then(() => {})
      }
    },
    onContextmenu: (e: MouseEvent) => {
      e.preventDefault()
      const mop = menuOptions[option.type]
      if (mop == null) {
        return
      }
      contextMenuParam.show = false
      nextTick().then(() => {
        contextMenuParam.options = mop({ connected: connectionStore.isConnected(option.name!) })
        contextMenuParam.currentNode = option
        contextMenuParam.x = e.clientX
        contextMenuParam.y = e.clientY
        contextMenuParam.show = true
        selectedKeys.value = [option.key as string]
      })
    },
  }
}

const renderContextLabel = (option: TreeOption) => {
  return h('div', { class: 'context-menu-item' }, option.label)
}

const handleSelectContextMenu = (key: string) => {
  contextMenuParam.show = false
  const { name, db, key: nodeKey, redisKey } = contextMenuParam.currentNode as ExtendedTreeOption
  switch (key) {
    case 'server_open':
      openConnection(name!).then(() => {})
      break
    case 'server_edit':
      dialogStore.openEditDialog(name as string)
      break
    case 'server_remove':
      removeConnection(name as string)
      break
    case 'server_close':
      connectionStore.closeConnection(name as string)
      break
  }
  console.warn('TODO: handle context menu:' + key)
}
</script>

<template>
  <n-tree
      :animated="false"
      :block-line="true"
      :block-node="true"
      :cancelable="false"
      :data="connectionStore.connections"
      :expand-on-click="true"
      :expanded-keys="expandedKeys"
      :on-update:selected-keys="onUpdateSelectedKeys"
      :node-props="nodeProps"
      :on-update:expanded-keys="onUpdateExpandedKeys"
      :selected-keys="selectedKeys"
      :render-label="renderLabel"
      :render-prefix="renderPrefix"
      class="fill-height"
      virtual-scroll
  />

  <!-- status display modal -->
  <n-modal :show="loadingConnection || openingConnection" transform-origin="center">
    <n-card
        :bordered="false"
        :content-style="{ textAlign: 'center' }"
        aria-model="true"
        role="dialog"
        style="width: 400px"
    >
      <n-spin>
        <template #description>
          {{ openingConnection ? $t('opening_connection') : '' }}
        </template>
      </n-spin>
    </n-card>
  </n-modal>

  <!-- context menu -->
  <n-dropdown
      :animated="false"
      :options="contextMenuParam.options"
      :render-label="renderContextLabel"
      :show="contextMenuParam.show"
      :x="contextMenuParam.x"
      :y="contextMenuParam.y"
      placement="bottom-start"
      trigger="manual"
      @clickoutside="contextMenuParam.show = false"
      @select="handleSelectContextMenu"
  />
</template>

<style lang="scss" scoped></style>
