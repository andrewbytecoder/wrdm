<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import useDialog from '@/stores/dialog'
import useConnectionStore from '@/stores/connections'
import { useI18n } from 'vue-i18n'
import { useMessage, FormInst, FormRules } from 'naive-ui'

interface NewForm {
  server: string
  key: string
  value: string
  ttl: number // seconds, -1 means no lease
}

const dialogStore = useDialog()
const connectionStore = useConnectionStore()
const i18n = useI18n()
const message = useMessage()

const form = reactive<NewForm>({
  server: '',
  key: '',
  value: '',
  ttl: -1,
})

const formRef = ref<FormInst | null>(null)

const rules = computed<FormRules>(() => {
  const requiredMsg = i18n.t('field_required')
  return {
    key: { required: true, message: requiredMsg, trigger: 'input' },
  }
})

watch(
  () => dialogStore.newKeyDialogVisible,
  (visible) => {
    if (!visible) return
    const { prefix, server } = dialogStore.newKeyParam
    form.server = server
    form.key = prefix || ''
    form.value = ''
    form.ttl = -1
  }
)

const toBase64 = (s: string): string => {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

const onConfirm = async () => {
  await formRef.value?.validate()
  try {
    let leaseId = 0
    if (form.ttl > 0) {
      const lease = await connectionStore.grantLease(form.server, form.ttl)
      leaseId = lease.id
    }
    await connectionStore.putKV(form.server, form.key, toBase64(form.value), leaseId)
    message.success(i18n.t('handle_succ'))
    dialogStore.closeNewKeyDialog()
  } catch (e: any) {
    message.error(e.message)
  }
}

const onClose = () => dialogStore.closeNewKeyDialog()
</script>

<template>
  <n-modal
    v-model:show="dialogStore.newKeyDialogVisible"
    :closable="false"
    :close-on-esc="false"
    :mask-closable="false"
    :negative-text="$t('cancel')"
    :positive-text="$t('confirm')"
    :show-icon="false"
    :title="$t('new_key')"
    preset="dialog"
    style="width: 600px"
    transform-origin="center"
    @positive-click="onConfirm"
    @negative-click="onClose"
  >
    <n-form
      ref="formRef"
      :model="form"
      :rules="rules"
      :show-require-mark="false"
      label-align="right"
      label-placement="left"
      label-width="100px"
    >
      <n-form-item :label="$t('key')" path="key" required>
        <n-input v-model:value="form.key" />
      </n-form-item>
      <n-form-item label="TTL">
        <n-input-number v-model:value="form.ttl" :min="-1" :max="Number.MAX_SAFE_INTEGER">
          <template #suffix>{{ $t('second') }}</template>
        </n-input-number>
      </n-form-item>
      <n-form-item :label="$t('value')">
        <n-input v-model:value="form.value" type="textarea" :resizable="false" />
      </n-form-item>
    </n-form>
  </n-modal>
</template>

