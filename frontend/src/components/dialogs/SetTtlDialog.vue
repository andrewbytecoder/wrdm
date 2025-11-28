<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import useDialog from '../../stores/dialog'
import useTabStore from '../../stores/tab.js'
import useConnectionStore from '../../stores/connections'
import { useMessage } from 'naive-ui'
import type { TabItem } from '../../stores/tab.js'
import {
  NForm,
  NFormItem,
  NInputNumber,
  NButton,
  // 其他需要的组件...
} from 'naive-ui'
interface TtlForm {
  ttl: number
}

interface UpdateTTLParams {
  server: string
  db: number
  key: string
  ttl: number
}

const ttlForm = reactive<TtlForm>({
  ttl: -1,
})

const formLabelWidth = '80px'
const dialogStore = useDialog()
const connectionStore = useConnectionStore()
const tabStore = useTabStore()

const currentServer = ref<string>('')
const currentKey = ref<string>('')
const currentDB = ref<number>(0)

watch(
    () => dialogStore.ttlDialogVisible,
    (visible) => {
      if (visible) {
        // get ttl from current tab
        const tab: TabItem | null = tabStore.currentTab
        if (tab != null) {
          if (tab.ttl !== undefined && tab.ttl >= 0) {
            ttlForm.ttl = tab.ttl
          }
          currentServer.value = tab.name
          currentDB.value = tab.db || 0
          currentKey.value = tab.key || ''
        }
      }
    }
)

const onClose = () => {
  dialogStore.closeTTLDialog()
}

const message = useMessage()

const onConfirm = async () => {
  try {
    const tab: TabItem | null = tabStore.currentTab
    if (tab == null) {
      return
    }
    const success = await connectionStore.setTTL(tab.name, tab.db || 0, tab.key || '', ttlForm.ttl)
    if (success) {
      tabStore.updateTTL({
        server: currentServer.value,
        db: currentDB.value,
        key: currentKey.value,
        ttl: ttlForm.ttl,
      } as UpdateTTLParams)
    }
  } catch (e: any) {
    message.error(e.message)
  } finally {
    dialogStore.closeTTLDialog()
  }
}
</script>

<template>
  <n-modal
      v-model:show="dialogStore.ttlDialogVisible"
      :closable="false"
      :close-on-esc="false"
      :mask-closable="false"
      :show-icon="false"
      :title="$t('set_ttl')"
      preset="dialog"
      transform-origin="center"
  >
    <n-form
        :label-width="formLabelWidth"
        :model="ttlForm"
        :show-require-mark="false"
        label-align="right"
        label-placement="left"
    >
      <n-form-item :label="$t('key')">
        <n-input :value="currentKey" readonly />
      </n-form-item>
      <n-form-item :label="$t('ttl')" required>
        <n-input-number
            v-model:value="ttlForm.ttl"
            :max="Number.MAX_SAFE_INTEGER"
            :min="-1"
            style="width: 100%"
        >
          <template #suffix>
            {{ $t('second') }}
          </template>
        </n-input-number>
      </n-form-item>
    </n-form>

    <template #action>
      <div class="flex-item-expand">
        <n-button @click="ttlForm.ttl = -1">{{ $t('persist_key') }}</n-button>
      </div>
      <div class="flex-item n-dialog__action">
        <n-button @click="onClose">{{ $t('cancel') }}</n-button>
        <n-button type="primary" @click="onConfirm">{{ $t('save') }}</n-button>
      </div>
    </template>
  </n-modal>
</template>

<style lang="scss" scoped></style>
