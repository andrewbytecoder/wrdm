<script setup lang="ts">
import { h, nextTick, onMounted, reactive, ref } from 'vue'
import { ConnectionType } from '../../consts/connection_type'
import { NIcon, useDialog, useMessage, TreeOption } from 'naive-ui'
import Key from '../icons/Key.vue'
import ToggleDb from '../icons/ToggleDb.vue'
import { get, indexOf } from 'lodash'
import { useI18n } from 'vue-i18n'
import Refresh from '../icons/Refresh.vue'
import CopyLink from '../icons/CopyLink.vue'
import Add from '../icons/Add.vue'
import Layer from '../icons/Layer.vue'
import Delete from '../icons/Delete.vue'
import Connect from '../icons/Connect.vue'
import useDialogStore from '../../stores/dialog'
import { ClipboardSetText } from '../../../wailsjs/runtime'
import useConnectionStore from '../../stores/connections'
import { renderIcon } from '../../utils/render_model'
import { useConfirmDialog } from '../../utils/confirm_dialog.js'


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
  opened?: boolean
  keys?: number
  expanded?: boolean
}

const i18n = useI18n()
const loading = ref(false)
const loadingConnections = ref(false)
const expandedKeys = ref<string[]>([])
const selectedKeys = ref<string[]>([])
const connectionStore = useConnectionStore()
const dialogStore = useDialogStore()

const contextMenuParam = reactive<ContextMenuParam>({
  show: false,
  x: 0,
  y: 0,
  options: null,
  currentNode: null,
})

//  Record<number, Function> 定义一个键值对，key为number，value为Function
const menuOptions: Record<number, Function> = {
  [ConnectionType.RedisDB]: (opened: boolean) => {
    if (opened) {
      return [
        {
          key: 'db_reload',
          label: i18n.t('reload'),
          icon: renderIcon(Refresh),
        },
        {
          key: 'db_newkey',
          label: i18n.t('new_key'),
          icon: renderIcon(Add),
        },
      ]
    } else {
      return [
        {
          key: 'db_open',
          label: i18n.t('open_db'),
          icon: renderIcon(Connect),
        },
      ]
    }
  },
  [ConnectionType.RedisKey]: () => [
    {
      key: 'key_reload',
      label: i18n.t('reload'),
      icon: renderIcon(Refresh),
    },
    {
      key: 'key_newkey',
      label: i18n.t('new_key'),
      icon: renderIcon(Add),
    },
    {
      key: 'key_copy',
      label: i18n.t('copy_path'),
      icon: renderIcon(CopyLink),
    },
    {
      type: 'divider',
      key: 'd1',
    },
    {
      key: 'key_remove',
      label: i18n.t('remove_path'),
      icon: renderIcon(Delete),
    },
  ],
  [ConnectionType.RedisValue]: () => [
    {
      key: 'value_reload',
      label: i18n.t('reload'),
      icon: renderIcon(Refresh),
    },
    {
      key: 'value_copy',
      label: i18n.t('copy_key'),
      icon: renderIcon(CopyLink),
    },
    {
      type: 'divider',
      key: 'd1',
    },
    {
      key: 'value_remove',
      label: i18n.t('remove_key'),
      icon: renderIcon(Delete),
    },
  ],
}

const renderContextLabel = (option: TreeOption) => {
  return h('div', { class: 'context-menu-item' }, option.label)
}

onMounted(async () => {
  try {
    // TODO: Show loading list status
    loadingConnections.value = true
    // nextTick(connectionStore.initConnection)
  } finally {
    loadingConnections.value = false
  }
})

const props = defineProps({
  server: String,
})

const expandKey = (key: string) => {
  const idx = indexOf(expandedKeys.value, key)
  if (idx === -1) {
    expandedKeys.value.push(key)
  } else {
    expandedKeys.value.splice(idx, 1)
  }
}

const message = useMessage()
const dialog = useDialog()
const onUpdateExpanded = (
    value: string[],
    option: TreeOption,
    meta: { node: TreeOption; action: 'expand' | 'collapse' }
) => {
  expandedKeys.value = value
  if (!meta.node) {
    return
  }
  // console.log(JSON.stringify(meta))
  switch (meta.action) {
    case 'expand':
      (meta.node as ExtendedTreeOption).expanded = true
      break
    case 'collapse':
      (meta.node as ExtendedTreeOption).expanded = false
      break
  }
}

const onUpdateSelectedKeys = ( keys: string[],
                               option: TreeOption,
                               meta: { node: TreeOption; action: 'expand' | 'collapse' }) => {
  selectedKeys.value = keys
}

const renderPrefix = ({ option }: { option: ExtendedTreeOption }) => {
  switch (option.type) {
    case ConnectionType.RedisDB:
      return h(
          NIcon,
          { size: 20 },
          {
            default: () => h(ToggleDb, { modelValue: option.opened === true }),
          }
      )
    case ConnectionType.RedisKey:
      return h(
          NIcon,
          { size: 20 },
          {
            default: () => h(Layer),
          }
      )
    case ConnectionType.RedisValue:
      return h(
          NIcon,
          { size: 20 },
          {
            default: () => h(Key),
          }
      )
    default:
      return null
  }
}

const renderLabel = ({ option }: { option: ExtendedTreeOption }) => {
  switch (option.type) {
    case ConnectionType.RedisDB:
    case ConnectionType.RedisKey:
      return `${option.label} (${option.keys || 0})`
      // case ConnectionType.RedisValue:
      //   return `[${option.keyType}]${option.label}`
  }
  return option.label
}

const renderSuffix = ({ option }: { option: ExtendedTreeOption }) => {
  // return h(NButton,
  //     { text: true, type: 'primary' },
  //     { default: () => h(Key) })
}

const nodeProps = ({ option }: { option: ExtendedTreeOption }) => {
  return {
    onClick() {
      connectionStore.select({ key: option.redisKey as  string,
        name: option.name as string,
        db: option.db as number,
        type: option.type as number, redisKey: option.redisKey as string })
      // console.log('[click]:' + JSON.stringify(option))
    },
    onDblclick: async () => {
      if (loading.value) {
        console.warn('TODO: alert to ignore double click when loading')
        return
      }
      switch (option.type) {
        case ConnectionType.Server:
          option.isLeaf = false
          break

        case ConnectionType.RedisDB:
          option.isLeaf = false
          break
      }

      // default handle is expand current node
      nextTick().then(() => expandKey(option.key!))
    },
    onContextmenu(e: MouseEvent) {
      e.preventDefault()
      const mop = menuOptions[option.type]
      if (mop == null) {
        return
      }
      contextMenuParam.show = false
      //  在下一帧刷新执行
      nextTick().then(() => {
        contextMenuParam.options = mop(option)
        contextMenuParam.currentNode = option
        contextMenuParam.x = e.clientX
        contextMenuParam.y = e.clientY
        contextMenuParam.show = true
        selectedKeys.value = [option.key as string]
      })
    },
    // onMouseover() {
    //   console.log('mouse over')
    // }
  }
}

const onLoadTree = async (node: ExtendedTreeOption) => {
  switch (node.type) {
    case ConnectionType.RedisDB:
      loading.value = true
      try {
        await connectionStore.openDatabase(node.name!, node.db!)
      } catch (e: any) {
        message.error(e.message)
        node.isLeaf = undefined
      } finally {
        loading.value = false
      }
      break
  }
}

const confirmDialog = useConfirmDialog()
const handleSelectContextMenu = (key: string) => {
  contextMenuParam.show = false
  const { name, db, key: nodeKey, redisKey } = contextMenuParam.currentNode as ExtendedTreeOption
  switch (key) {
      // case 'server_reload':
      // case 'db_reload':
      //     connectionStore.loadKeyValue()
      //     break
    case 'db_newkey':
    case 'key_newkey':
      dialogStore.openNewKeyDialog(redisKey!, name!, db!)
      break
    case 'key_remove':
    case 'value_remove':
      confirmDialog.warning(i18n.t('delete_key_tip', { key: redisKey }), () => {
        connectionStore.removeKey(name as string, db as number, redisKey as string).then((success) => {
          if (success) {
            message.success(i18n.t('delete_key_succ', { key: redisKey }))
          }
        })
      })

      break
    case 'key_copy':
    case 'value_copy':
      ClipboardSetText(redisKey!)
          .then((succ) => {
            if (succ) {
              message.success(i18n.t('copy_succ'))
            }
          })
          .catch((e: any) => {
            message.error(e.message)
          })
      break
    default:
      console.warn('TODO: handle context menu:' + key)
  }
}

const handleOutsideContextMenu = () => {
  contextMenuParam.show = false
}
</script>

<template>
  <n-tree
      :block-line="true"
      :block-node="true"
      :animated="true"
      :cancelable="false"
      :data="connectionStore.databases[(props.server as String).toString()] || []"
      :expand-on-click="true"
      :expanded-keys="expandedKeys"
      :on-update:selected-keys="onUpdateSelectedKeys"
      :node-props="nodeProps"
      :on-load="onLoadTree"
      :selected-keys="selectedKeys"
      :on-update:expanded-keys="onUpdateExpanded"
      :render-label="renderLabel"
      :render-prefix="renderPrefix"
      :render-suffix="renderSuffix"
      class="fill-height"
      virtual-scroll
  />
  <n-dropdown
      :animated="false"
      :options="contextMenuParam.options"
      :render-label="renderContextLabel"
      :show="contextMenuParam.show"
      :x="contextMenuParam.x"
      :y="contextMenuParam.y"
      placement="bottom-start"
      trigger="manual"
      @clickoutside="handleOutsideContextMenu"
      @select="handleSelectContextMenu"
  />
</template>

<style lang="scss" scoped></style>
