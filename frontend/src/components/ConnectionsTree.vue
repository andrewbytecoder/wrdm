<script setup lang="ts">
import { h, nextTick, onMounted, reactive, ref, type VNodeChild } from 'vue'
import { ConnectionType } from '../consts/connection_type.js'
import useConnection from '../stores/connection.js'
import {
  NIcon,
  NTree,
  NDropdown,
  useDialog,
  useMessage,
  type TreeOption,
  type DropdownOption
} from 'naive-ui'
import ToggleFolder from './icons/ToggleFolder.vue'
import Key from './icons/Key.vue'
import ToggleDb from './icons/ToggleDb.vue'
import ToggleServer from './icons/ToggleServer.vue'
import { indexOf, remove, startsWith } from 'lodash-es'
import { useI18n } from 'vue-i18n'
import Refresh from './icons/Refresh.vue'
import Config from './icons/Config.vue'
import CopyLink from './icons/CopyLink.vue'
import Unlink from './icons/Unlink.vue'
import Add from './icons/Add.vue'
import Layer from './icons/Layer.vue'
import Delete from './icons/Delete.vue'
import Connect from './icons/Connect.vue'
import useDialogStore from '../stores/dialog.js'
import { ClipboardSetText } from '../../wailsjs/runtime'
import useTabStore from '../stores/tab.js'

// 类型定义 - 修复接口扩展问题
interface MenuOption {
  key: string
  label: string
  icon?: () => VNodeChild
  type?: string
  [key: string]: any // 允许其他属性
}

interface TreeNode extends TreeOption {
  type: ConnectionType
  key: string
  label: string
  name?: string
  db?: number
  redisKey?: string
  keyType?: string
  keys?: number
  expanded?: boolean
  connected?: boolean
  opened?: boolean
  isLeaf?: boolean
}

interface ContextPosition {
  x: number
  y: number
}

// 响应式数据
const i18n = useI18n()
const loading = ref<boolean>(false)
const loadingConnections = ref<boolean>(false)
const expandedKeys = ref<string[]>([])
const connectionStore = useConnection()
const tabStore = useTabStore()
const dialogStore = useDialogStore()

const showContextMenu = ref<boolean>(false)
const contextPos = reactive<ContextPosition>({ x: 0, y: 0 })
const contextMenuOptions = ref<any[] | null>(null) // 使用 any 避免复杂类型
const currentContextNode = ref<TreeNode | null>(null)

// Store hooks
const dialog = useDialog()

// 图标渲染函数
const renderIcon = (icon: any) => {
  return () => h(NIcon, null, { default: () => h(icon) })
}

// 菜单选项配置
const menuOptions: Record<ConnectionType, (option: TreeNode) => any[]> = {
  [ConnectionType.Group]: (option: TreeNode) => [
    {
      key: 'group_reload',
      label: i18n.t('config_conn_group') as string,
      icon: renderIcon(Config),
    },
    {
      key: 'group_delete',
      label: i18n.t('remove_conn_group') as string,
      icon: renderIcon(Delete),
    },
  ],
  [ConnectionType.Server]: (option: TreeNode) => {
    if (option.connected) {
      return [
        {
          key: 'server_reload',
          label: i18n.t('reload') as string,
          icon: renderIcon(Refresh),
        },
        {
          key: 'server_disconnect',
          label: i18n.t('disconnect') as string,
          icon: renderIcon(Unlink),
        },
        {
          key: 'server_dup',
          label: i18n.t('dup_conn') as string,
          icon: renderIcon(CopyLink),
        },
        {
          key: 'server_config',
          label: i18n.t('config_conn') as string,
          icon: renderIcon(Config),
        },
        {
          type: 'divider',
          key: 'd1',
        },
        {
          key: 'server_remove',
          label: i18n.t('remove_conn') as string,
          icon: renderIcon(Delete),
        },
      ]
    } else {
      return [
        {
          key: 'server_open',
          label: i18n.t('open_connection') as string,
          icon: renderIcon(Connect),
        },
      ]
    }
  },
  [ConnectionType.RedisDB]: (option: TreeNode) => {
    if (option.opened) {
      return [
        {
          key: 'db_reload',
          label: i18n.t('reload') as string,
          icon: renderIcon(Refresh),
        },
        {
          key: 'db_newkey',
          label: i18n.t('new_key') as string,
          icon: renderIcon(Add),
        },
      ]
    } else {
      return [
        {
          key: 'db_open',
          label: i18n.t('open_db') as string,
          icon: renderIcon(Connect),
        },
      ]
    }
  },
  [ConnectionType.RedisKey]: (option: TreeNode) => [
    {
      key: 'key_reload',
      label: i18n.t('reload') as string,
      icon: renderIcon(Refresh),
    },
    {
      key: 'key_newkey',
      label: i18n.t('new_key') as string,
      icon: renderIcon(Add),
    },
    {
      key: 'key_copy',
      label: i18n.t('copy_path') as string,
      icon: renderIcon(CopyLink),
    },
    {
      type: 'divider',
      key: 'd1',
    },
    {
      key: 'key_remove',
      label: i18n.t('remove_path') as string,
      icon: renderIcon(Delete),
    },
  ],
  [ConnectionType.RedisValue]: (option: TreeNode) => [
    {
      key: 'value_reload',
      label: i18n.t('reload') as string,
      icon: renderIcon(Refresh),
    },
    {
      key: 'value_copy',
      label: i18n.t('copy_key') as string,
      icon: renderIcon(CopyLink),
    },
    {
      type: 'divider',
      key: 'd1',
    },
    {
      key: 'value_remove',
      label: i18n.t('remove_key') as string,
      icon: renderIcon(Delete),
    },
  ],
}

// 生命周期
onMounted(async (): Promise<void> => {
  try {
    loadingConnections.value = true
    await nextTick(() => connectionStore.initConnection())
  } finally {
    loadingConnections.value = false
  }
})

// 工具函数
const expandKey = (key: string): void => {
  const idx = indexOf(expandedKeys.value, key)
  if (idx === -1) {
    expandedKeys.value.push(key)
  } else {
    expandedKeys.value.splice(idx, 1)
  }
}

const collapseKeyAndChildren = (key: string): void => {
  remove(expandedKeys.value, (k: string) => startsWith(k, key))
}

// 事件处理函数
const onUpdateExpanded = (value: string[]): void => {
  expandedKeys.value = value
}

const renderContextLabel = (option: any): VNodeChild => {
  return h('div', { class: 'context-menu-item' }, option.label)
}

// 修复渲染函数类型
const renderPrefix = (info: any): VNodeChild => {
  const option = info.option as TreeNode
  switch (option.type) {
    case ConnectionType.Group:
      return h(
          NIcon,
          { size: 20 },
          { default: () => h(ToggleFolder, { modelValue: option.expanded === true }) }
      )
    case ConnectionType.Server:
      return h(
          NIcon,
          { size: 20 },
          { default: () => h(ToggleServer, { modelValue: option.connected === true }) }
      )
    case ConnectionType.RedisDB:
      return h(
          NIcon,
          { size: 20 },
          { default: () => h(ToggleDb, { modelValue: option.opened === true }) }
      )
    case ConnectionType.RedisKey:
      return h(NIcon, { size: 20 }, { default: () => h(Layer) })
    case ConnectionType.RedisValue:
      return h(NIcon, { size: 20 }, { default: () => h(Key) })
    default:
      return null
  }
}

const renderLabel = (info: any): string => {
  const option = info.option as TreeNode
  switch (option.type) {
    case ConnectionType.RedisDB:
    case ConnectionType.RedisKey:
      return `${option.label} (${option.keys || 0})`
  }
  return option.label
}

const renderSuffix = (info: any): VNodeChild => {
  return null
}

// 修复 nodeProps 函数类型
const nodeProps = (info: any) => {
  const option = info.option as TreeNode
  return {
    onClick(): void {
      connectionStore.select({
        key: option.key,
        name: option.name as string,
        db: option.db as number,
        type: option.type,
        redisKey: option.redisKey as string
      })
    },
    onDblclick: async (): Promise<void> => {
      if (loading.value) {
        console.warn('TODO: alert to ignore double click when loading')
        return
      }

      switch (option.type) {
        case ConnectionType.Server:
        case ConnectionType.RedisDB:
          option.isLeaf = false
          break
      }

      await nextTick(() => expandKey(option.key))
    },
    onContextmenu(e: MouseEvent): void {
      e.preventDefault()
      const mop = menuOptions[option.type]
      if (!mop) {
        return
      }

      showContextMenu.value = false
      nextTick().then(() => {
        contextMenuOptions.value = mop(option)
        currentContextNode.value = option
        contextPos.x = e.clientX
        contextPos.y = e.clientY
        showContextMenu.value = true
      })
    },
  }
}

// 修复 onLoadTree 函数类型
const onLoadTree = async (node: TreeOption): Promise<void> => {
  const message = useMessage()
  const treeNode = node as TreeNode

  switch (treeNode.type) {
    case ConnectionType.Server:
      loading.value = true
      try {
        await connectionStore.openConnection(treeNode.name!)
      } catch (e: any) {
        message.error(e.message)
        treeNode.isLeaf = undefined
      } finally {
        loading.value = false
      }
      break
    case ConnectionType.RedisDB:
      loading.value = true
      try {
        await connectionStore.openDatabase(treeNode.name!, treeNode.db!)
      } catch (e: any) {
        message.error(e.message)
        treeNode.isLeaf = undefined
      } finally {
        loading.value = false
      }
      break
  }
}

const handleSelectContextMenu = (key: string): void => {
  const message = useMessage()
  showContextMenu.value = false
  if (!currentContextNode.value) return

  const { name, db, key: nodeKey, redisKey } = currentContextNode.value

  switch (key) {
    case 'server_disconnect':
      connectionStore.closeConnection(nodeKey).then((success: boolean) => {
        if (success) {
          collapseKeyAndChildren(nodeKey)
          tabStore.removeTabByName(name!)
        }
      })
      break
    case 'db_newkey':
    case 'key_newkey':
      dialogStore.openNewKeyDialog(redisKey as string, name!, db as number)
      break
    case 'key_remove':
    case 'value_remove':
      dialog.warning({
        title: i18n.t('warning') as string,
        content: i18n.t('delete_key_tip', { key: redisKey }) as string,
        closable: false,
        autoFocus: false,
        transformOrigin: 'center',
        positiveText: i18n.t('confirm') as string,
        negativeText: i18n.t('cancel') as string,
        onPositiveClick: () => {
          connectionStore.removeKey(name!, db!, redisKey!).then((success: boolean) => {
            if (success) {
              message.success(i18n.t('delete_key_succ', { key: redisKey }) as string)
            }
          })
        },
      })
      break
    case 'key_copy':
    case 'value_copy':
      ClipboardSetText(redisKey!)
          .then((succ: boolean) => {
            if (succ) {
              message.success(i18n.t('copy_succ') as string)
            }
          })
          .catch((e: Error) => {
            message.error(e.message)
          })
      break
    default:
      console.warn('TODO: handle context menu:' + key)
  }
}

const handleOutsideContextMenu = (): void => {
  showContextMenu.value = false
}
</script>

<template>
  <n-tree
      :block-line="true"
      :block-node="true"
      :data="connectionStore.connections"
      :expand-on-click="false"
      :expanded-keys="expandedKeys"
      :node-props="nodeProps"
      :on-load="onLoadTree"
      :on-update:expanded-keys="onUpdateExpanded"
      :render-label="renderLabel"
      :render-prefix="renderPrefix"
      :render-suffix="renderSuffix"
      class="fill-height"
      virtual-scroll
  />
  <n-dropdown
      v-if="contextMenuOptions"
      :animated="false"
      :options="contextMenuOptions"
      :render-label="renderContextLabel"
      :show="showContextMenu"
      :x="contextPos.x"
      :y="contextPos.y"
      placement="bottom-start"
      trigger="manual"
      @clickoutside="handleOutsideContextMenu"
      @select="handleSelectContextMenu"
  />
</template>

<style lang="scss" scoped>
</style>