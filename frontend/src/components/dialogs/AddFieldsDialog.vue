<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { types } from '../../consts/support_redis_type'
import useDialog from '../../stores/dialog'
import NewStringValue from '../new_value/NewStringValue.vue'
import NewSetValue from '../new_value/NewSetValue.vue'
import useConnectionStore from '../../stores/connection.js'
import { useI18n } from 'vue-i18n'
import { useMessage } from 'naive-ui'
import AddListValue from '../new_value/AddListValue.vue'
import AddHashValue from '../new_value/AddHashValue.vue'
import AddZSetValue from '../new_value/AddZSetValue.vue'
import type { Component } from 'vue'

interface NewForm {
  server: string
  db: number
  key: string
  type: string
  opType: number
  value: any
  reload: boolean
}

interface HashValueItem {
  field: string
  value: string
}

interface SetValueItem {
  value: string
}

interface ZSetValueItem {
  value: string
  score: number
}

const i18n = useI18n()

const newForm = reactive<NewForm>({
  server: '',
  db: 0,
  key: '',
  type: '',
  opType: 0,
  value: null,
  reload: true,
})

const formLabelWidth = '60px'

const addValueComponent: Record<string, Component> = {
  [types.STRING]: NewStringValue,
  [types.HASH]: AddHashValue,
  [types.LIST]: AddListValue,
  [types.SET]: NewSetValue,
  [types.ZSET]: AddZSetValue,
}

const defaultValue: Record<string, any> = {
  [types.STRING]: '',
  [types.HASH]: [],
  [types.LIST]: [],
  [types.SET]: [],
  [types.ZSET]: [],
}

/**
 * dialog title
 */
const title = computed<string>(() => {
  switch (newForm.type) {
    case types.LIST:
      return i18n.t('new_item')
    case types.HASH:
      return i18n.t('new_field')
    case types.SET:
      return i18n.t('new_field')
    case types.ZSET:
      return i18n.t('new_field')
  }
  return ''
})

const dialogStore = useDialog()

watch(
    () => dialogStore.addFieldsDialogVisible,
    (visible) => {
      if (visible) {
        const { server, db, key, type } = dialogStore.addFieldParam
        newForm.server = server
        newForm.db = db
        newForm.key = key
        newForm.type = type || ""
        newForm.opType = 0
        newForm.value = null
      }
    }
)

const connectionStore = useConnectionStore()
const message = useMessage()

const onAdd = async () => {
  try {
    const { server, db, key, type } = newForm
    let { value } = newForm
    if (value == null) {
      value = defaultValue[type]
    }
    switch (type) {
      case types.LIST:
      {
        let data
        if (newForm.opType === 1) {
          data = await connectionStore.prependListItem(server, db, key, value)
        } else {
          data = await connectionStore.appendListItem(server, db, key, value)
        }
        const { success, msg } = data
        if (success) {
          if (newForm.reload) {
            connectionStore.loadKeyValue(server, db, key).then(() => {})
          }
          message.success(i18n.t('handle_succ'))
        } else {
          message.error(msg || i18n.t('handle_fail'))
        }
      }
        break

      case types.HASH:
      {
        const { success, msg } = await connectionStore.addHashField(server, db, key, newForm.opType, value)
        if (success) {
          if (newForm.reload) {
            connectionStore.loadKeyValue(server, db, key).then(() => {})
          }
          message.success(i18n.t('handle_succ'))
        } else {
          message.error(msg || i18n.t('handle_fail'))
        }
      }
        break

      case types.SET:
      {
        const { success, msg } = await connectionStore.addSetItem(server, db, key, value)
        if (success) {
          if (newForm.reload) {
            connectionStore.loadKeyValue(server, db, key).then(() => {})
          }
          message.success(i18n.t('handle_succ'))
        } else {
          message.error(msg || i18n.t('handle_fail'))
        }
      }
        break

      case types.ZSET:
      {
        const { success, msg } = await connectionStore.addZSetItem(server, db, key, newForm.opType, value)
        if (success) {
          if (newForm.reload) {
            connectionStore.loadKeyValue(server, db, key).then(() => {})
          }
          message.success(i18n.t('handle_succ'))
        } else {
          message.error(msg || i18n.t('handle_fail'))
        }
      }
        break
    }
    dialogStore.closeAddFieldsDialog()
  } catch (e: any) {
    message.error(e.message)
  }
}

const onClose = () => {
  dialogStore.closeAddFieldsDialog()
}
</script>

<template>
  <!-- Naive UI Modal 组件 -->

<!--

    双向绑定控制模态框显示/隐藏。
    dialogStore.addFieldsDialogVisible 是一个响应式布尔值，
    通常存储在 Pinia/Vuex 或组件的 setup 中。

  v-model:show="dialogStore.addFieldsDialogVisible"

   禁用右上角关闭按钮
  :closable="false"

  禁用按 ESC 键关闭
  :close-on-esc="false"

   禁用点击遮罩层关闭
  :mask-closable="false"

  配置取消按钮属性，这里是大小
  :negative-button-props="{ size: 'medium' }"

   设置取消按钮文本，使用 $t 国际化
  :negative-text="$t('cancel')"

   配置确认按钮属性
  :positive-button-props="{ size: 'medium' }"

  设置确认按钮文本，使用 $t 国际化
  :positive-text="$t('confirm')"

  不显示图标
  :show-icon="false"

   设置模态框标题，绑定到组件的 title 变量
  :title="title"

  使用预设样式 'dialog'
  preset="dialog"

  设置模态框宽度
  style="width: 600px"

  设置变换原点
  transform-origin="center"

  点击确认按钮触发的事件
  @positive-click="onAdd"

  点击取消按钮触发的事件
  @negative-click="onClose"

-->

  <n-modal
  v-model:show="dialogStore.addFieldsDialogVisible"
  :closable="false"
  :close-on-esc="false"
  :mask-closable="false"
  :negative-button-props="{ size: 'medium' }"
  :negative-text="$t('cancel')"
  :positive-button-props="{ size: 'medium' }"
  :positive-text="$t('confirm')"
  :show-icon="false"
  :title="title"
  preset="dialog"
  style="width: 600px"
  transform-origin="center"
  @positive-click="onAdd"
  @negative-click="onClose"
  >

  <!-- 内容区域开始 -->

  <!--
    Naive UI Scrollbar 组件，使表单内容可滚动，
    防止内容过多时溢出。
  -->
  <n-scrollbar style="max-height: 500px">

    <!--
      Naive UI Form 组件，用于布局和校验表单。
      :model="newForm" 绑定表单数据对象。
      其他属性控制标签对齐和宽度。
    -->
    <n-form
        :label-width="formLabelWidth"
        :model="newForm"
        :show-require-mark="false"
    label-align="right"
    label-placement="left"
    style="padding-right: 15px"
    >

    <!--
     Form Item 项：Key 输入框。
     :label="$t('key')" 设置国际化标签。
     path="key" 关联到 newForm.key，用于校验。
     required 表示此项必填。
    -->
    <n-form-item :label="$t('key')" path="key" required>

      <!--
       Input 输入框。
       v-model:value 双向绑定到 newForm.key。
       readonly 表示只读。
       placeholder="" 空占位符（可能是故意留空）。
      -->
      <n-input v-model:value="newForm.key" placeholder="" readonly />

    </n-form-item>

    <!--
     动态组件渲染。
     :is="addValueComponent[newForm.type]" 根据 newForm.type 的值
     动态决定渲染哪个组件。
     例如，如果 newForm.type 是 'text'，则渲染 addValueComponent['text'] 对应的组件。

     v-model:type 和 v-model:value 是传递给动态组件的 prop，
     同时也监听这些 prop 的更新事件 (update:type, update:value)。
    -->
    <component
        :is="addValueComponent[newForm.type]"
        v-model:type="newForm.opType"
        v-model:value="newForm.value"
    />

    <!--
     另一个 Form Item 项：复选框。
     label=" " 空标签占位，保持与其他项对齐。
     path="key" 这里可能是个小问题或有意为之，通常应该对应 newForm.reload。
     required 可能在这里意义不大，因为复选框本身就有 true/false 状态。
    -->
    <n-form-item label=" " path="key" required> <!-- 注意：path 可能需要改为 reload -->

      <!--
       Checkbox 复选框。
       v-model:checked 双向绑定到 newForm.reload。
       显示文本也是国际化的。
      -->
      <n-checkbox v-model:checked="newForm.reload">
        {{ $t('reload_when_succ') }}
      </n-checkbox>

    </n-form-item>

    </n-form>

  </n-scrollbar>

  </n-modal>
</template>

<style lang="scss" scoped></style>
