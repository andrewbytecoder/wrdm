<script setup lang="ts">
import { reactive, watch } from 'vue'
import useDialog from '@/stores/dialog'
import useConnectionStore from '@/stores/connections'
import { useMessage } from 'naive-ui'

const dialogStore = useDialog()
const connectionStore = useConnectionStore()
const message = useMessage()

const state = reactive({
  server: '',
  json: '[]',
  mode: 'onlyNew' as 'overwrite' | 'skip' | 'onlyNew',
  loading: false,
})

watch(
  () => dialogStore.importDialogVisible,
  (visible) => {
    if (!visible) return
    const { server, json, mode } = dialogStore.importParam
    state.server = server
    state.json = json || '[]'
    state.mode = mode || 'onlyNew'
  }
)

const onConfirm = async () => {
  state.loading = true
  try {
    const res = await connectionStore.importData(state.server, state.json, state.mode)
    message.success(`imported: ${res.imported}`)
    dialogStore.closeImportDialog()
  } catch (e: any) {
    message.error(e.message)
  } finally {
    state.loading = false
  }
}

const onClose = () => dialogStore.closeImportDialog()
</script>

<template>
  <n-modal
    v-model:show="dialogStore.importDialogVisible"
    :closable="false"
    :close-on-esc="false"
    :mask-closable="false"
    :show-icon="false"
    title="Import"
    preset="dialog"
    style="width: 700px"
    transform-origin="center"
    @positive-click="onConfirm"
    @negative-click="onClose"
  >
    <n-form :show-require-mark="false" label-width="auto" label-placement="left">
      <n-form-item :label="$t('server')">
        <n-input :value="state.server" readonly />
      </n-form-item>
      <n-form-item label="Mode">
        <n-select
          v-model:value="state.mode"
          :options="[
            { label: 'onlyNew', value: 'onlyNew' },
            { label: 'skip', value: 'skip' },
            { label: 'overwrite', value: 'overwrite' },
          ]"
        />
      </n-form-item>
      <n-form-item label="JSON">
        <n-input v-model:value="state.json" type="textarea" :resizable="false" :rows="12" />
      </n-form-item>
    </n-form>

    <template #action>
      <div class="flex-item n-dialog__action">
        <n-button @click="onClose">{{ $t('cancel') }}</n-button>
        <n-button type="primary" :loading="state.loading" @click="onConfirm">{{ $t('confirm') }}</n-button>
      </div>
    </template>
  </n-modal>
</template>

