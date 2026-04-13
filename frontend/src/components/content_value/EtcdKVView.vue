<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMessage, useThemeVars } from 'naive-ui'
import { ClipboardSetText } from '@wails/runtime'
import useConnectionStore, { KVItem } from '@/stores/connections'
import useDialogStore from '@/stores/dialog'

interface Props {
  server: string
  keyPath: string
  kv: KVItem | null
}

const props = defineProps<Props>()
const themeVars = useThemeVars()
const i18n = useI18n()
const message = useMessage()
const connectionStore = useConnectionStore()
const dialogStore = useDialogStore()

type ViewAs = 'text' | 'json' | 'base64'
const viewAs = ref<ViewAs>('text')

const decodeBase64Bytes = (b64: string): Uint8Array => {
  const bin = atob(b64 || '')
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

const kvText = computed(() => {
  if (!props.kv) return ''
  try {
    const bytes = decodeBase64Bytes(props.kv.valueBase64 || '')
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  } catch {
    return ''
  }
})

const kvJsonPretty = computed(() => {
  try {
    const obj = JSON.parse(kvText.value)
    return JSON.stringify(obj, null, 2)
  } catch {
    return kvText.value
  }
})

const viewValue = computed(() => {
  if (!props.kv) return ''
  switch (viewAs.value) {
    case 'base64':
      return props.kv.valueBase64 || ''
    case 'json':
      return kvJsonPretty.value
    case 'text':
    default:
      return kvText.value
  }
})

const editValue = ref('')
const inEdit = ref(false)
const saving = ref(false)

watch(
  () => props.kv?.valueBase64,
  () => {
    if (!inEdit.value) {
      editValue.value = viewValue.value
    }
  },
  { immediate: true }
)

const onCopyValue = () => {
  ClipboardSetText(viewValue.value)
    .then((succ) => {
      if (succ) message.success(i18n.t('copy_succ'))
    })
    .catch((e: any) => message.error(e.message))
}

const onEdit = () => {
  editValue.value = viewValue.value
  inEdit.value = true
}

const onCancel = () => {
  inEdit.value = false
}

const toBase64 = (s: string): string => {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

const onSave = async () => {
  if (!props.kv) return
  saving.value = true
  try {
    let base64: string
    if (viewAs.value === 'base64') {
      base64 = editValue.value
      // validate
      decodeBase64Bytes(base64)
    } else {
      base64 = toBase64(editValue.value)
    }
    await connectionStore.putKV(props.server, props.keyPath, base64, props.kv.lease || 0)
    message.success(i18n.t('save_update'))
  } catch (e: any) {
    message.error(e.message)
  } finally {
    inEdit.value = false
    saving.value = false
  }
}

const onOpenLease = () => {
  dialogStore.openLeaseDialog(props.server, props.keyPath, props.kv?.lease || 0)
}
</script>

<template>
  <div class="kv-wrapper flex-box-v">
    <div class="kv-meta flex-box-h">
      <n-space size="small" align="center">
        <n-text depth="2">Key:</n-text>
        <n-text>{{ keyPath }}</n-text>
        <n-divider vertical />
        <n-text depth="2">modRev:</n-text>
        <n-text>{{ kv?.modRevision ?? '-' }}</n-text>
        <n-text depth="2">ver:</n-text>
        <n-text>{{ kv?.version ?? '-' }}</n-text>
        <n-text depth="2">lease:</n-text>
        <n-text>{{ kv?.lease ?? 0 }}</n-text>
      </n-space>
      <div class="flex-item-expand" />
      <n-select
        v-model:value="viewAs"
        :options="[
          { label: 'text', value: 'text' },
          { label: 'json', value: 'json' },
          { label: 'base64', value: 'base64' },
        ]"
        size="small"
        style="width: 120px"
      />
      <n-button-group v-if="!inEdit" size="small">
        <n-button @click="onCopyValue">{{ $t('copy_value') }}</n-button>
        <n-button @click="onOpenLease">Lease</n-button>
        <n-button @click="onEdit">{{ $t('edit_value') }}</n-button>
      </n-button-group>
      <n-button-group v-else size="small">
        <n-button :loading="saving" @click="onSave">{{ $t('save_update') }}</n-button>
        <n-button :disabled="saving" @click="onCancel">{{ $t('cancel_update') }}</n-button>
      </n-button-group>
    </div>

    <div class="kv-value flex-item-expand flex-box-v">
      <n-scrollbar v-if="!inEdit" class="flex-item-expand">
        <n-code :code="viewValue" show-line-numbers word-wrap style="cursor: text" />
      </n-scrollbar>
      <n-input
        v-else
        v-model:value="editValue"
        :disabled="saving"
        :resizable="false"
        class="flex-item-expand"
        type="textarea"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.kv-wrapper {
  height: 100%;
  overflow: hidden;
}

.kv-meta {
  gap: 8px;
  align-items: center;
  padding: 6px 0;
  border-bottom: v-bind('themeVars.borderColor') 1px solid;
}

.kv-value {
  overflow: hidden;
}
</style>

