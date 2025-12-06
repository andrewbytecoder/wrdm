<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { types } from '../../consts/support_redis_type'
import useDialog from '../../stores/dialog'
import { isEmpty, keys, map } from 'lodash'
import NewStringValue from '../new_value/NewStringValue.vue'
import NewHashValue from '../new_value/NewHashValue.vue'
import NewListValue from '../new_value/NewListValue.vue'
import NewZSetValue from '../new_value/NewZSetValue.vue'
import NewSetValue from '../new_value/NewSetValue.vue'
import useConnectionStore from '../../stores/connections'
import { useI18n } from 'vue-i18n'
import { useMessage, FormInst, FormRules, FormItemRule } from 'naive-ui'
import type { Component } from 'vue'

interface NewForm {
  server: string
  db: number
  key: string
  type: string
  ttl: number
  value: any
}

interface Option {
  value: string
  label: string
}

const i18n = useI18n()
const message = useMessage()

const newForm = reactive<NewForm>({
  server: '',
  db: 0,
  key: '',
  type: '',
  ttl: -1,
  value: null,
})

const formRules = computed<FormRules>(() => {
  const requiredMsg = i18n.t('field_required')
  return {
    key: { required: true, message: requiredMsg, trigger: 'input' },
    type: { required: true, message: requiredMsg, trigger: 'input' },
    ttl: { required: true, message: requiredMsg, trigger: 'input' },
  }
})
const dbOptions = computed(() =>
    map(keys(connectionStore.databases[newForm.server]), (key) => ({
      label: key,
      value: parseInt(key),
    }))
)
// 表单数据合法验证工具
const newFormRef = ref<FormInst | null>(null)

const formLabelWidth = '100px'

const options = computed<Option[]>(() => {
  return Object.keys(types).map((t) => ({
    value: t,
    label: t,
  }))
})

const addValueComponent: Record<string, Component> = {
  [types.STRING]: NewStringValue,
  [types.HASH]: NewHashValue,
  [types.LIST]: NewListValue,
  [types.SET]: NewSetValue,
  [types.ZSET]: NewZSetValue,
}

const defaultValue: Record<string, any> = {
  [types.STRING]: '',
  [types.HASH]: [],
  [types.LIST]: [],
  [types.SET]: [],
  [types.ZSET]: [],
}

const dialogStore = useDialog()

watch(
    () => dialogStore.newKeyDialogVisible,
    (visible) => {
      if (visible) {
        const { prefix, server, db } = dialogStore.newKeyParam
        newForm.server = server
        newForm.db = db
        newForm.key = isEmpty(prefix) ? '' : prefix
        newForm.type = options.value[0].value
        newForm.ttl = -1
        newForm.value = null
      }
    }
)

const connectionStore = useConnectionStore()

const onAdd = async () => {
  // 校验数据是否合法
  await newFormRef.value?.validate((errors) => {
    if (!errors) {
      message.success('Valid')
    }
    else {
      console.log(errors)
      message.error('Invalid')
    }
  })

  try {
    //  将对应的数据取出
    const { server, db, key, type, ttl } = newForm
    let { value } = newForm
    console.log("--------", newForm.value)
    if (value == null) {
      value = defaultValue[type]
    }
    console.log("--------", newForm.value)
    console.log("--------", value)
    const { success, msg } = await connectionStore.setKey(server, db, key, type, value, ttl)
    if (success) {
      dialogStore.closeNewKeyDialog()
    } else {
      message.error(msg || i18n.t('handle_fail'))
    }
  } catch (e: any) {
    message.error(e.message)
  }
}

const onClose = () => {
  dialogStore.closeNewKeyDialog()
}
</script>

<template>
  <n-modal
      v-model:show="dialogStore.newKeyDialogVisible"
      :closable="false"
      :close-on-esc="false"
      :mask-closable="false"
      :negative-button-props="{ size: 'medium' }"
      :negative-text="$t('cancel')"
      :positive-button-props="{ size: 'medium' }"
      :positive-text="$t('confirm')"
      :show-icon="false"
      :title="$t('new_key')"
      preset="dialog"
      style="width: 600px"
      transform-origin="center"
      @positive-click="onAdd"
      @negative-click="onClose"
  >
    <n-scrollbar style="max-height: 500px">
      <n-form
          ref="newFormRef"
          :label-width="formLabelWidth"
          :model="newForm"
          :rules="formRules"
          :show-require-mark="false"
          label-align="right"
          label-placement="left"
          style="padding-right: 15px"
      >
        <n-form-item :label="$t('key')" path="key" required>
          <n-input v-model:value="newForm.key" placeholder="" />
        </n-form-item>
        <n-form-item :label="$t('db_index')" path="db" required>
          <n-select v-model:value="newForm.db" :options="dbOptions" />
        </n-form-item>
        <n-form-item :label="$t('type')" path="type" required>
          <n-select v-model:value="newForm.type" :options="options" />
        </n-form-item>
        <n-form-item :label="$t('ttl')" required>
          <n-input-group>
            <n-input-number
                v-model:value="newForm.ttl"
                :max="Number.MAX_SAFE_INTEGER"
                :min="-1"
                placeholder="TTL"
            >
              <template #suffix>
                {{ $t('second') }}
              </template>
            </n-input-number>
            <n-button secondary type="primary" @click="newForm.ttl = -1">{{ $t('persist_key') }}</n-button>
          </n-input-group>
        </n-form-item>
        <component :is="addValueComponent[newForm.type]" v-model:value="newForm.value" />
        <!--  TODO: Add import from txt file option -->
      </n-form>
    </n-scrollbar>
  </n-modal>
</template>

<style lang="scss" scoped></style>
