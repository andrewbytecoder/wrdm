<script setup lang="ts">
import { reactive, watch } from 'vue'
import useDialog from '@/stores/dialog'
import useConnectionStore from '@/stores/connections'
import { useMessage } from 'naive-ui'
import { useI18n } from 'vue-i18n'

interface DeleteForm {
  server: string
  key: string
  withPrefix: boolean
}

const deleteForm = reactive<DeleteForm>({
  server: '',
  key: '',
  withPrefix: false,
})

const dialogStore = useDialog()
const connectionStore = useConnectionStore()
const i18n = useI18n()
const message = useMessage()

watch(
  () => dialogStore.deleteKeyDialogVisible,
  (visible) => {
    if (!visible) return
    const { server, key } = dialogStore.deleteKeyParam
    deleteForm.server = server
    deleteForm.key = key
    deleteForm.withPrefix = false
  }
)

const onConfirmDelete = async () => {
  try {
    await connectionStore.deleteKey(deleteForm.server, deleteForm.key, deleteForm.withPrefix)
    message.success(i18n.t('handle_succ'))
  } catch (e: any) {
    message.error(e.message)
  }
  dialogStore.closeDeleteKeyDialog()
}

const onClose = () => dialogStore.closeDeleteKeyDialog()
</script>

<template>
  <n-modal
    v-model:show="dialogStore.deleteKeyDialogVisible"
    :closable="false"
    :close-on-esc="false"
    :mask-closable="false"
    :show-icon="false"
    :title="$t('remove_key')"
    preset="dialog"
    transform-origin="center"
  >
    <n-form :model="deleteForm" :show-require-mark="false" label-align="right" label-placement="left" label-width="auto">
      <n-form-item :label="$t('server')">
        <n-input :value="deleteForm.server" readonly />
      </n-form-item>
      <n-form-item :label="$t('key')" required>
        <n-input v-model:value="deleteForm.key" />
      </n-form-item>
      <n-form-item label="Prefix">
        <n-switch v-model:value="deleteForm.withPrefix" />
      </n-form-item>
    </n-form>

    <template #action>
      <div class="flex-item n-dialog__action">
        <n-button @click="onClose">{{ $t('cancel') }}</n-button>
        <n-button type="error" @click="onConfirmDelete">{{ $t('confirm') }}</n-button>
      </div>
    </template>
  </n-modal>
</template>

