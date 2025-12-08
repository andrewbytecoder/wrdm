<script setup lang="ts">
import useDialogStore from '../../stores/dialog'
import { h, nextTick, onMounted, reactive, ref } from 'vue'
import useConnectionStore,  { DatabaseItem } from '../../stores/connections'
import { NIcon, useDialog, useMessage, TreeSelectOption, TreeOption, TreeDropInfo  } from 'naive-ui'
import { ConnectionType } from '../../consts/connection_type'
import ToggleFolder from '../icons/ToggleFolder.vue'
import ToggleServer from '../icons/ToggleServer.vue'
import { debounce, indexOf, throttle } from 'lodash'
import Config from '../icons/Config.vue'
import Delete from '../icons/Delete.vue'
import Unlink from '../icons/Unlink.vue'
import CopyLink from '../icons/CopyLink.vue'
import Connect from '../icons/Connect.vue'
import { useI18n } from 'vue-i18n'
import useTabStore from '../../stores/tab'
import Edit from '../icons/Edit.vue'
import { renderIcon } from '../../utils/render_model'
import { useConfirmDialog } from '../../utils/confirm_dialog.js'
import {ConnectionItem} from "../../config/dbs";
// import { TreeOption } from 'naive-ui/lib/tree/src/interface';

interface ContextMenuParam {
  show: boolean
  x: number
  y: number
  options: any[] | null
  currentNode: TreeSelectOption  | null
}

interface ExtendedTreeOption extends TreeOption  {
  type: number
  name?: string
  db?: number
  redisKey?: string
}

export interface DropOption {
  node: ExtendedTreeOption;
  dragNode: ExtendedTreeOption;
  dropPosition: 'before' | 'after' | 'inside';
}

const i18n = useI18n()
const openingConnection = ref(false)
const connectionStore = useConnectionStore()
const tabStore = useTabStore()
const dialogStore = useDialogStore()
const message = useMessage()

const expandedKeys = ref<string[]>([])
const selectedKeys = ref<string[]>([])

// 出来的数据是引用 ref类型，如果在js中需要进行解引用
// 用于辅助 v-model进行数据解析
const filterPattern = defineModel<string>('filterPattern')

const contextMenuParam = reactive<ContextMenuParam>({
  show: false,
  x: 0,
  y: 0,
  options: null,
  currentNode: null,
})

//  这里的函数是留给自己使用的函数，后面的mod会调用，传入的参数也是 ExtendedTreeOption
const menuOptions: Record<number, Function> = {
  [ConnectionType.Group]: () => [
    {
      key: 'group_rename',
      label: i18n.t('rename_conn_group'),
      icon: renderIcon(Edit),
    },
    {
      key: 'group_delete',
      label: i18n.t('remove_conn_group'),
      icon: renderIcon(Delete),
    },
  ],
  [ConnectionType.Server]: ({ name }: ExtendedTreeOption ) => {
    const connected = connectionStore.isConnected(name as string)
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
          key: 'server_edit',
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

const renderLabel = ({ option }: { option: TreeSelectOption }) => {
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

const onUpdateExpandedKeys = (keys: string[], option: TreeSelectOption) => {
  expandedKeys.value = keys
}

const onUpdateSelectedKeys = (keys: string[], option: TreeSelectOption) => {
  selectedKeys.value = keys
}

/**
 * Open connection
 * @param name
 */
const openConnection = async (name: string) => {
  try {
    console.log('openConnection', name)
    if (!connectionStore.isConnected(name)) {
      openingConnection.value = true
      await connectionStore.openConnection(name, false)
    }
    tabStore.upsertTab({
      blank: false, key: "", name: "", type: "",
      server: name,
      db: 0
    })
  } catch (e: any) {
    message.error(e.message)
    // node.isLeaf = undefined
  } finally {
    openingConnection.value = false
  }
}


const dialog = useDialog()
const confirmDialog = useConfirmDialog()
const removeConnection = async (name: string) => {
  confirmDialog.warning(i18n.t('remove_tip', { type: i18n.t('conn_name'), name }), async () => {
    connectionStore.deleteConnection(name).then(({ success, msg }) => {
      if (!success) {
        message.error(msg)
      }
    })
  })
}

const removeGroup = async (name: string) => {
  confirmDialog.warning(i18n.t('remove_tip', { type: i18n.t('conn_group'), name }), async () => {
    connectionStore.deleteGroup(name, false).then(({ success, msg }) => {
      if (!success) {
        message.error(msg)
      }
    })
  })
}

//  todo 双击打开
const nodeProps = ({ option }: { option: ExtendedTreeOption }) => {
  return {
    onDblclick()  {
      if (option.type === ConnectionType.Server) {
        openConnection(option.name!).then(() => {})
      }
    },
    onContextmenu(e: MouseEvent): void {
      e.preventDefault()
      const mop = menuOptions[option.type]
      if (mop == null) {
        return
      }
      contextMenuParam.show = false
      nextTick().then(() => {
        contextMenuParam.options = mop(option)
        contextMenuParam.currentNode = option
        contextMenuParam.x = e.clientX
        contextMenuParam.y = e.clientY
        contextMenuParam.show = true
        selectedKeys.value = [option.key as string]
      })
    },
  }
}

const renderContextLabel = (option: TreeSelectOption) => {
  return h('div', { class: 'context-menu-item' }, option.label)
}

const handleSelectContextMenu = (key: string) => {
  contextMenuParam.show = false
  const { name, label, db, key: nodeKey, redisKey } = contextMenuParam.currentNode as ExtendedTreeOption
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
    case 'group_rename':
      dialogStore.openRenameGroupDialog(label as string)
      break
    case 'group_delete':
      removeGroup(label as string)
      break
  }
  console.warn('TODO: handle context menu:' + key)
}

function findSiblingsAndIndex(
    node: TreeOption,
    nodes?: TreeOption[]
): [TreeOption[], number] | [null, null] {
  if (!nodes)
    return [null, null]
  for (let i = 0; i < nodes.length; ++i) {
    const siblingNode = nodes[i]
    if (siblingNode.key === node.key)
      return [nodes, i]
    const [siblings, index] = findSiblingsAndIndex(node, siblingNode.children)
    if (siblings && index !== null)
      return [siblings, index]
  }
  return [null, null]
}

// delay save until stop drop after 2 seconds
const saveSort = debounce(connectionStore.saveConnectionSorted, 2000, { trailing: true })

//  拖动
const handleDrop = ({ node, dragNode, dropPosition }: TreeDropInfo) => {
    const [dragNodeSiblings, dragNodeIndex] = findSiblingsAndIndex(dragNode, connectionStore.connections)
    if (dragNodeSiblings === null || dragNodeIndex === null) {
      return
    }
    dragNodeSiblings.splice(dragNodeIndex, 1)
    if (dropPosition === 'inside') {
      if (node.children) {
        node.children.unshift(dragNode)
      } else {
        node.children = [dragNode]
      }
    } else if (dropPosition === 'before') {
      const [nodeSiblings, nodeIndex] = findSiblingsAndIndex(node, connectionStore.connections)
      if (nodeSiblings === null || nodeIndex === null) {
        return
      }
      nodeSiblings.splice(nodeIndex, 0, dragNode)
    } else if (dropPosition === 'after') {
      const [nodeSiblings, nodeIndex] = findSiblingsAndIndex(node, connectionStore.connections)
      if (nodeSiblings === null || nodeIndex === null) {
        return
      }
      nodeSiblings.splice(nodeIndex + 1, 0, dragNode)
    }
    connectionStore.connections = Array.from(connectionStore.connections)
    saveSort()
}

</script>

<template>
  <n-tree
      :animated="false"
      :block-line="true"
      :block-node="true"
      :cancelable="false"
      :draggable="true"
      :data="connectionStore.connections"
      :expanded-keys="expandedKeys"
      @update:selected-keys="onUpdateSelectedKeys"
      :node-props="nodeProps"
      @update:expanded-keys="onUpdateExpandedKeys"
      :selected-keys="selectedKeys"
      :render-label="renderLabel"
      :render-prefix="renderPrefix"
      @drop="handleDrop"
      :pattern="filterPattern"
      class="fill-height"
      virtual-scroll
  />

  <!-- status display modal -->
  <n-modal :show="openingConnection" transform-origin="center">
    <n-card
        :bordered="false"
        :content-style="{ textAlign: 'center' }"
        aria-model="true"
        role="dialog"
        style="width: 400px"
    >
      <n-spin>
        <template #description>
          {{ $t('opening_connection') }}
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
