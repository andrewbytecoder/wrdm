<script setup lang="ts">
import { computed, h, nextTick, reactive, ref, watch } from 'vue'
import { NIcon, NSpace, useMessage, TreeOption, DropdownOption } from 'naive-ui'
import ToggleServer from '@/components/icons/ToggleServer.vue'
import KeyIcon from '@/components/icons/Key.vue'
import LayerIcon from '@/components/icons/Layer.vue'
import Add from '@/components/icons/Add.vue'
import CopyLink from '@/components/icons/CopyLink.vue'
import Delete from '@/components/icons/Delete.vue'
import useDialogStore from '@/stores/dialog'
import useConnectionStore from '@/stores/connections'
import { useI18n } from 'vue-i18n'
import { ClipboardSetText } from '@wails/runtime'
import { useConfirmDialog } from '@/utils/confirm_dialog'
import { renderIcon } from '@/utils/render_model'
import useTabStore from '@/stores/tab'

type NodeType = 'server' | 'prefix' | 'key'

type EtcdTreeNode = TreeOption & {
  type: NodeType
  server: string
  pathPrefix?: string
  keyPath?: string
  isLeaf?: boolean
}

interface Props {
  server: string
}

const props = withDefaults(defineProps<Props>(), { server: '' })
const connectionStore = useConnectionStore()
const dialogStore = useDialogStore()
const tabStore = useTabStore()
const i18n = useI18n()
const message = useMessage()
const confirmDialog = useConfirmDialog()

const backgroundColor = computed(() => {
  const { markColor: hex = '' } = connectionStore.serverProfile[props.server] || {}
  if (!hex) return ''
  const bigint = parseInt(hex.slice(1), 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, 0.2)`
})

const loading = ref(false)
const expandedKeys = ref<string[]>([props.server])
const selectedKeys = ref<string[]>([props.server])

watch(
  () => props.server,
  (server) => {
    expandedKeys.value = server ? [server] : []
    selectedKeys.value = server ? [server] : []
  },
  { immediate: true }
)

const rootNode = computed<EtcdTreeNode>(() => ({
  key: props.server,
  label: props.server,
  type: 'server',
  server: props.server,
  isLeaf: false,
  children: undefined,
}))

const data = computed<EtcdTreeNode[]>(() => [rootNode.value])

interface DropDownMenuParam {
  show: boolean
  x: number
  y: number
  options: any[] | null
  currentNode: any | null
}

const contextMenuParam = reactive<DropDownMenuParam>({
  show: false,
  x: 0,
  y: 0,
  options: null,
  currentNode: null,
})

const menuOptions = (node: any): any[] => {
  switch (node.type) {
    case 'server':
      return [
        { key: 'server_reload', label: i18n.t('reload'), icon: renderIcon(ToggleServer) },
        { key: 'server_close', label: i18n.t('disconnect'), icon: renderIcon(Delete) },
      ]
    case 'prefix':
      return [
        { key: 'prefix_newkey', label: i18n.t('new_key'), icon: renderIcon(Add) },
        { key: 'prefix_copy', label: i18n.t('copy_path'), icon: renderIcon(CopyLink) },
        { type: 'divider', key: 'd1' },
        { key: 'prefix_remove', label: i18n.t('remove_path'), icon: renderIcon(Delete) },
      ]
    case 'key':
    default:
      return [
        { key: 'key_copy', label: i18n.t('copy_key'), icon: renderIcon(CopyLink) },
        { type: 'divider', key: 'd1' },
        { key: 'key_remove', label: i18n.t('remove_key'), icon: renderIcon(Delete) },
      ]
  }
}

const buildChildren = (prefix: string, keys: string[]): EtcdTreeNode[] => {
  const layerNames = new Set<string>()
  const keyNames: { keyPath: string; label: string }[] = []

  for (const fullKey of keys) {
    const rest = fullKey.startsWith(prefix) ? fullKey.slice(prefix.length) : fullKey
    const trimmed = rest.startsWith('/') ? rest.slice(1) : rest
    if (!trimmed) continue
    const parts = trimmed.split('/')
    if (parts.length === 1) {
      keyNames.push({ keyPath: fullKey, label: parts[0] })
    } else {
      layerNames.add(parts[0])
    }
  }

  const layers = Array.from(layerNames)
    .sort((a, b) => a.localeCompare(b))
    .map((layer) => {
      const p = prefix === '' ? `${layer}/` : `${prefix}${layer}/`
      return {
        key: `${props.server}#${p}`,
        label: layer,
        type: 'prefix' as const,
        server: props.server,
        pathPrefix: p,
        isLeaf: false,
        children: undefined,
      }
    })

  const keysNodes = keyNames
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((k) => ({
      key: k.keyPath,
      label: k.label,
      type: 'key' as const,
      server: props.server,
      keyPath: k.keyPath,
      isLeaf: true,
    }))

  return [...layers, ...keysNodes]
}

const renderPrefix = ({ option }: { option: TreeOption }) => {
  const node = option as EtcdTreeNode
  switch (node.type) {
    case 'server':
      return h(NIcon, { size: 20 }, { default: () => h(ToggleServer, { modelValue: true }) })
    case 'prefix':
      return h(NIcon, { size: 20 }, { default: () => h(LayerIcon) })
    case 'key':
    default:
      return h(NIcon, { size: 20 }, { default: () => h(KeyIcon) })
  }
}

const renderLabel = ({ option }: { option: TreeOption }) => option.label as string

const renderSuffix = ({ option }: { option: TreeOption }) => {
  const node = option as EtcdTreeNode
  if (node.type === 'prefix' && node.pathPrefix) {
    return h(NSpace, { align: 'center', inline: true, size: 2 }, () => [
      h('span', { style: { opacity: 0.55, fontSize: '12px' } }, node.pathPrefix),
    ])
  }
  return null
}

const nodeProps = ({ option }: { option: TreeOption }) => {
  const node: any = option
  return {
    onDblclick: () => {
      if (loading.value) return
      nextTick()
    },
    onContextmenu: (e: MouseEvent) => {
      e.preventDefault()
      contextMenuParam.show = false
      nextTick().then(() => {
        contextMenuParam.options = menuOptions(node)
        contextMenuParam.currentNode = node
        contextMenuParam.x = e.clientX
        contextMenuParam.y = e.clientY
        contextMenuParam.show = true
        selectedKeys.value = [node.key as string]
      })
    },
  }
}

const onLoadTree = async (node: EtcdTreeNode) => {
  loading.value = true
  try {
    if (!props.server) {
      message.error('BrowserTree: empty server')
      return
    }
    if (!connectionStore.isConnected(props.server)) {
      await connectionStore.openConnection(props.server, false)
    }
    const prefix = node.type === 'prefix' ? node.pathPrefix || '' : ''
    await connectionStore.ensureWatch(props.server, prefix)
    const res = await connectionStore.listKeys(props.server, prefix, node.type === 'server' ? 1000 : 2000, '', true)
    const keys = (res.kvs || []).map((k) => k.key)
    node.children = buildChildren(prefix, keys)
    if (!node.children || (Array.isArray(node.children) && node.children.length === 0)) {
      message.warning(`No keys under prefix "${prefix}" (count=${res.count ?? 0})`)
    }
  } catch (e: any) {
    message.error(e.message)
  } finally {
    loading.value = false
  }
}

const onUpdateSelectedKeys = async (keys: string[], options: TreeOption[]) => {
  try {
    if (!options || options.length === 0) return
    const node = options[0] as EtcdTreeNode
    if (node.type === 'key' && node.keyPath) {
      const kv = await connectionStore.getKV(props.server, node.keyPath)
      tabStore.upsertTab({
        blank: false,
        name: props.server,
        server: props.server,
        db: 0,
        type: 'kv',
        ttl: -1,
        key: node.keyPath,
        value: kv,
      })
    } else {
      tabStore.upsertTab({
        blank: false,
        name: props.server,
        server: props.server,
        db: 0,
        type: 'kv',
        ttl: -1,
        key: '',
        value: null,
      })
    }
  } finally {
    selectedKeys.value = keys
  }
}

const handleOutsideContextMenu = () => {
  contextMenuParam.show = false
}

const onUpdateExpandedKeys = (v: string[]) => {
  expandedKeys.value = v
}

const handleSelectContextMenu = (actionKey: string) => {
  contextMenuParam.show = false
  const node = contextMenuParam.currentNode
  if (!node) return

  switch (actionKey) {
    case 'server_reload':
      connectionStore.openConnection(props.server, true).then(() => message.success(i18n.t('reload_succ')))
      break
    case 'server_close':
      connectionStore.closeConnection(props.server)
      break
    case 'prefix_newkey':
      dialogStore.openNewKeyDialog(node.pathPrefix || '', props.server, 0)
      break
    case 'prefix_copy':
      ClipboardSetText(node.pathPrefix || '')
        .then((succ) => succ && message.success(i18n.t('copy_succ')))
        .catch((e: any) => message.error(e.message))
      break
    case 'prefix_remove':
      confirmDialog.warning(i18n.t('remove_tip', { name: node.pathPrefix }), () => {
        connectionStore
          .deleteKey(props.server, node.pathPrefix || '', true)
          .then(() => message.success(i18n.t('delete_key_succ', { key: node.pathPrefix })))
      })
      break
    case 'key_copy':
      ClipboardSetText(node.keyPath || '')
        .then((succ) => succ && message.success(i18n.t('copy_succ')))
        .catch((e: any) => message.error(e.message))
      break
    case 'key_remove':
      confirmDialog.warning(i18n.t('remove_tip', { name: node.keyPath }), () => {
        connectionStore
          .deleteKey(props.server, node.keyPath || '', false)
          .then(() => message.success(i18n.t('delete_key_succ', { key: node.keyPath })))
      })
      break
  }
}
</script>

<template>
  <div class="browser-tree-wrapper" :style="{ backgroundColor }">
    <n-tree
      :block-line="true"
      :block-node="true"
      :animated="false"
      :cancelable="false"
      :data="data"
      :expand-on-click="false"
      :expanded-keys="expandedKeys"
      :selected-keys="selectedKeys"
      :on-load="onLoadTree"
      :node-props="nodeProps"
      :render-label="renderLabel"
      :render-prefix="renderPrefix"
      :render-suffix="renderSuffix"
      class="fill-height"
      virtual-scroll
      @update:selected-keys="onUpdateSelectedKeys"
      @update:expanded-keys="onUpdateExpandedKeys"
    />
    <n-dropdown
      :animated="false"
      :options="contextMenuParam.options"
      :show="contextMenuParam.show"
      :x="contextMenuParam.x"
      :y="contextMenuParam.y"
      placement="bottom-start"
      trigger="manual"
      @clickoutside="handleOutsideContextMenu"
      @select="handleSelectContextMenu"
    />
  </div>
</template>

<style lang="scss" scoped>
.browser-tree-wrapper {
  height: 100%;
  overflow: hidden;
}
</style>

