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
  json: '',
  result: '',
  loading: false,
})

watch(
  () => dialogStore.txnDialogVisible,
  (visible) => {
    if (!visible) return
    const { server, json } = dialogStore.txnParam
    state.server = server
    state.json = json
    state.result = ''
  }
)

const runTxn = async () => {
  state.loading = true
  try {
    const obj = JSON.parse(state.json || '{}')
    const compares = obj.compares || []
    const successOps = obj.successOps || []
    const failOps = obj.failOps || []
    const res = await connectionStore.txn(state.server, compares, successOps, failOps)
    state.result = JSON.stringify(res, null, 2)
  } catch (e: any) {
    message.error(e.message)
  } finally {
    state.loading = false
  }
}

const onClose = () => dialogStore.closeTxnDialog()
</script>

<template>
  <n-modal
    v-model:show="dialogStore.txnDialogVisible"
    :closable="false"
    :close-on-esc="false"
    :mask-closable="false"
    :show-icon="false"
    title="Txn"
    preset="dialog"
    style="width: 800px"
    transform-origin="center"
  >
    <n-form :show-require-mark="false" label-width="auto" label-placement="left">
      <n-form-item :label="$t('server')">
        <n-input :value="state.server" readonly />
      </n-form-item>
      <n-form-item label="Input JSON">
        <n-input v-model:value="state.json" type="textarea" :resizable="false" :rows="10" />
      </n-form-item>
      <n-form-item label="Result">
        <n-input v-model:value="state.result" type="textarea" :resizable="false" :rows="10" />
      </n-form-item>
    </n-form>

    <template #action>
      <div class="flex-item n-dialog__action">
        <n-button @click="onClose">{{ $t('cancel') }}</n-button>
        <n-button type="primary" :loading="state.loading" @click="runTxn">Run</n-button>
      </div>
    </template>
  </n-modal>
</template>

