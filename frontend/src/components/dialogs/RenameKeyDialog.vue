<script setup lang="ts">
import { reactive, watch } from 'vue'
import useDialog from '@/stores/dialog'
import useConnectionStore from '@/stores/connections'
import { useMessage } from 'naive-ui'
import { useI18n } from 'vue-i18n'

interface RenameForm {
  server: string
  key: string
  newKey: string
}

const renameForm = reactive<RenameForm>({
  server: '',
  key: '',
  newKey: '',
})

const dialogStore = useDialog()
const connectionStore = useConnectionStore()

watch(
    () => dialogStore.renameDialogVisible,
    (visible) => {
      if (visible) {
        const { server, db, key } = dialogStore.renameKeyParam
        renameForm.server = server
        renameForm.key = key
        renameForm.newKey = key
      }
    }
)

const i18n = useI18n()
const message = useMessage()

const onRename = async () => {
  try {
    const { server, key, newKey } = renameForm
    await connectionStore.renameKey(server, key, newKey, true)
    message.success(i18n.t('handle_succ'))
  } catch (e: any) {
    message.error(e.message)
  }
  dialogStore.closeRenameKeyDialog()
}

const onClose = () => {
  dialogStore.closeRenameKeyDialog()
}
</script>

<!-- Rename 画笔按钮-->
<template>
  <n-modal
      v-model:show="dialogStore.renameDialogVisible"
      :closable="false"
      :close-on-esc="false"
      :mask-closable="false"
      :negative-button-props="{ size: 'medium' }"
      :negative-text="$t('cancel')"
      :positive-button-props="{ size: 'medium' }"
      :positive-text="$t('confirm')"
      :show-icon="false"
      :title="$t('rename_key')"
      preset="dialog"
      transform-origin="center"
      @positive-click="onRename"
      @negative-click="onClose"
  >
    <n-form
        :model="renameForm"
        :show-require-mark="false"
        label-align="left"
        label-placement="left"
        label-width="auto"
    >
      <n-form-item :label="$t('new_key_name')" required>
        <n-input v-model:value="renameForm.newKey" />
      </n-form-item>
    </n-form>
  </n-modal>
</template>

<style lang="scss" scoped></style>
