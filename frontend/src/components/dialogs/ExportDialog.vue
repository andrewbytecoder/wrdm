<script setup lang="ts">
import { reactive, watch } from 'vue'
import useDialog from '@/stores/dialog'
import useConnectionStore from '@/stores/connections'
import { useMessage } from 'naive-ui'
import { ClipboardSetText } from '@wails/runtime'

const dialogStore = useDialog()
const connectionStore = useConnectionStore()
const message = useMessage()

const state = reactive({
  server: '',
  prefix: '',
  json: '',
  count: 0,
  loading: false,
})

watch(
  () => dialogStore.exportDialogVisible,
  async (visible) => {
    if (!visible) return
    const { server, prefix } = dialogStore.exportParam
    state.server = server
    state.prefix = prefix || ''
    state.json = ''
    state.count = 0
  }
)

const doExport = async () => {
  state.loading = true
  try {
    const res = await connectionStore.exportPrefix(state.server, state.prefix)
    state.json = res.json
    state.count = res.count
  } catch (e: any) {
    message.error(e.message)
  } finally {
    state.loading = false
  }
}

const onCopy = () => {
  ClipboardSetText(state.json || '')
    .then((succ) => succ && message.success('Copied'))
    .catch((e: any) => message.error(e.message))
}

const onClose = () => dialogStore.closeExportDialog()
</script>

<template>
  <n-modal
    v-model:show="dialogStore.exportDialogVisible"
    :closable="false"
    :close-on-esc="false"
    :mask-closable="false"
    :show-icon="false"
    title="Export"
    preset="dialog"
    style="width: 700px"
    transform-origin="center"
  >
    <n-form :show-require-mark="false" label-width="auto" label-placement="left">
      <n-form-item :label="$t('server')">
        <n-input :value="state.server" readonly />
      </n-form-item>
      <n-form-item label="Prefix">
        <n-input v-model:value="state.prefix" />
      </n-form-item>
      <n-form-item label="Result">
        <n-input v-model:value="state.json" type="textarea" :resizable="false" :rows="10" />
      </n-form-item>
    </n-form>

    <template #action>
      <div class="flex-item n-dialog__action">
        <n-button @click="onClose">{{ $t('cancel') }}</n-button>
        <n-button :loading="state.loading" @click="doExport">Export</n-button>
        <n-button :disabled="!state.json" @click="onCopy">Copy</n-button>
        <n-text depth="3" style="margin-left: 8px">count: {{ state.count }}</n-text>
      </div>
    </template>
  </n-modal>
</template>

