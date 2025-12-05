<script setup lang="ts">
import { get, isEmpty, map } from 'lodash'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { TestConnection } from '../../../wailsjs/go/services/connectionService.js'
import useDialog from '../../stores/dialog'
import { useMessage, FormInst, FormRules, FormValidationError } from 'naive-ui'
import Close from '../icons/Close.vue'
import useConnectionStore from '../../stores/connections'
import {types} from "../../../wailsjs/go/models";
import {ConnectionItem} from '../../config/dbs'


interface TestConnectionResponse {
  success?: boolean
  msg: string
}

const generalFormValue: ConnectionItem = {
  key: "",
  label: "",
  group: '',
  name: '',
  addr: '127.0.0.1',
  port: 6379,
  username: '',
  password: '',
  defaultFilter: '*',
  keySeparator: ':',
  connTimeout: 60,
  execTimeout: 60,
  markColor: ''
}

/**
 * Dialog for create or edit connection
 */
const dialogStore = useDialog()
const connectionStore = useConnectionStore()
const message = useMessage()
const i18n = useI18n()

const editName = ref<string>('')
const generalForm = ref(generalFormValue)

// 定义那些输入框是必填的
const generalFormRules = (): FormRules => {
  const requiredMsg = i18n.t('field_required')
  return {
    name: { required: true, message: requiredMsg, trigger: 'input' },
    addr: { required: true, message: requiredMsg, trigger: 'input' },
    defaultFilter: { required: true, message: requiredMsg, trigger: 'input' },
    keySeparator: { required: true, message: requiredMsg, trigger: 'input' },
  }
}

const isEditMode = computed((): boolean => {
  return !isEmpty(editName.value)
})

const groupOptions = computed(() => {
  const options = map(connectionStore.groups, (group:string) => ({
    value: group,
    label: group,
  }))
  options.splice(0, 0, {
    value: '',
    label: i18n.t('no_group'),
  })
  return options
})

const tab = ref<string>('general')

// 显示连接进度条
const loading = ref<boolean>(false)
const showTestResult = ref<boolean>(false)
const testResult = ref<string>('')

const showTestConnSuccResult = computed<boolean>(() => {
  return isEmpty(testResult.value) && showTestResult.value === true
})

const showTestConnFailResult = computed<boolean>(() => {
  return !isEmpty(testResult.value) && showTestResult.value === true
})
const formLabelWidth = computed<string>(() => {
  // Compatible with long english word
  if (tab.value === 'advanced' && i18n.locale.value === 'en') {
    return '140px'
  }
  return '80px'
})
const predefineColors = ref<string[]>(['', '#FE5959', '#FEC230', '#FEF27F', '#6CEFAF', '#46C3FC', '#B388FC', '#B0BEC5'])

const generalFormRef = ref<FormInst | null>(null)
const advanceFormRef = ref<FormInst | null>(null)

const onSaveConnection = async () => {
    // Validate general form
    await generalFormRef.value?.validate((errors) => {
      if (errors) {
        // Dom更新的下一个时间段
        nextTick(() => (tab.value = 'general'))
      }
    })

    // Validate advance form
    await advanceFormRef.value?.validate((errors) => {
      if (errors) {
        nextTick(() => (tab.value = 'advanced'))
      }
    })

    // Store new connection Promise返回的结果需要进行  await
    const { success, msg } = await connectionStore.saveConnection(editName.value, generalForm.value)
    if (!success) {
      message.error(msg)
      return
    }

    // 弹窗提示连接诶成功
    message.success(i18n.t('handle_succ'))
    // 关闭弹窗
    onClose()
}

// 刚进来将所有值按照初始化进行设置
const resetForm = () => {
    generalForm.value = connectionStore.newDefaultConnection("")
    generalFormRef.value?.restoreValidation()
    showTestResult.value = false
    testResult.value = ''
    tab.value = 'general'
}

watch(
    // 当打开dialog的时候 将editName的值设置为connParam里面获取的值
    () => dialogStore.connDialogVisible,
    (visible) => {
      if (visible) {
        editName.value = get(dialogStore.connParam, 'name', '')
        generalForm.value = dialogStore.connParam
      }
    }
)

const onTestConnection = async () => {
    testResult.value = ''
    // 显示连接进度条
    loading.value = true
    let result = ''
    try {
      const { addr, port, username, password } = generalForm.value
      const { success = false, msg } = await TestConnection(addr as string, port as number, username as string, password as string)
      if (!success) {
        result = msg
      }
    } catch (e: any) {
      result = e.message
    } finally {
      loading.value = false
      showTestResult.value = true
    }

    if (!isEmpty(result)) {
      testResult.value = result
    } else {
      testResult.value = ''
    }
}

const onClose = () => {
    if (isEditMode.value) {
      dialogStore.closeEditDialog()
    } else {
      dialogStore.closeNewDialog()
    }
}
</script>

<template>
<!--  New Connection dialog 窗口 -->
  <n-modal
      v-model:show="dialogStore.connDialogVisible"
      :closable="false"
      :close-on-esc="false"
      :mask-closable="false"
      :on-after-leave="resetForm"
      :show-icon="false"
      :title="isEditMode ? $t('edit_conn_title') : $t('new_conn_title')"
      preset="dialog"
      transform-origin="center"
  >
<!--    定义多个tabs 通过 tab进行选择-->
    <n-tabs v-model:value="tab" type="line" animated>
<!--      第一个tab 选项是 general -->
<!--     tab 显示什么  name： 选择的标签-->
<!--      打标签显示是坐对其还是右对齐-->
      <n-tab-pane :tab="$t('general')" display-directive="show" name="general">
        <n-form
            :ref="generalFormRef"
            :label-width="formLabelWidth"
            :model="generalForm"
            :rules="generalFormRules()"
            :show-require-mark="false"
            label-align="right"
            label-placement="left"
        >
                    <n-form-item :label="$t('conn_name')" path="name" required>
            <n-input v-model:value="generalForm.name" :placeholder="$t('conn_name_tip')" />
          </n-form-item>
          <n-form-item v-if="!isEditMode" :label="$t('conn_group')" required>
            <n-select v-model:value="generalForm.group" :options="groupOptions" />
          </n-form-item>
                    <n-form-item :label="$t('conn_addr')" path="addr" required>
            <n-input v-model:value="generalForm.addr" :placeholder="$t('conn_addr_tip')" />
            <n-text style="width: 40px; text-align: center">:</n-text>
            <n-input-number v-model:value="generalForm.port" :max="65535" :min="1" style="width: 200px" />
          </n-form-item>
          <n-form-item :label="$t('conn_pwd')" path="password">
            <n-input
                v-model:value="generalForm.password"
                :placeholder="$t('conn_pwd_tip')"
                show-password-on="click"
                type="password"
            />
          </n-form-item>
                    <n-form-item :label="$t('conn_usr')" path="username">
                        <n-input v-model="generalForm.username" :placeholder="$t('conn_usr_tip')" />
                    </n-form-item>
                </n-form>
            </n-tab-pane>

<!--       第二个选项是advanced -->
      <n-tab-pane :tab="$t('advanced')" display-directive="show" name="advanced">
        <n-form
            ref="advanceFormRef"
            :label-width="formLabelWidth"
            :model="generalForm"
            :rules="generalFormRules()"
            :show-require-mark="false"
            label-align="right"
            label-placement="left"
        >
                    <n-form-item :label="$t('conn_advn_filter')" path="defaultFilter">
            <n-input v-model:value="generalForm.defaultFilter" :placeholder="$t('conn_advn_filter_tip')" />
          </n-form-item>
                    <n-form-item :label="$t('conn_advn_separator')" path="keySeparator">
            <n-input
                v-model:value="generalForm.keySeparator"
                :placeholder="$t('conn_advn_separator_tip')"
            />
          </n-form-item>
                    <n-form-item :label="$t('conn_advn_conn_timeout')" path="connTimeout">
            <n-input-number v-model:value="generalForm.connTimeout" :max="999999" :min="1">
              <template #suffix>
                {{ $t('second') }}
              </template>
            </n-input-number>
          </n-form-item>
                    <n-form-item :label="$t('conn_advn_exec_timeout')" path="execTimeout">
            <n-input-number v-model:value="generalForm.execTimeout" :max="999999" :min="1">
              <template #suffix>
                {{ $t('second') }}
              </template>
            </n-input-number>
          </n-form-item>
          <n-form-item :label="$t('conn_advn_mark_color')" path="markColor">
            <div
                v-for="color in predefineColors"
                :key="color"
                :class="{
                'color-preset-item_selected': generalForm.markColor === color,
              }"
                :style="{ backgroundColor: color }"
                class="color-preset-item"
                @click="generalForm.markColor = color"
            >
              <n-icon v-if="color === ''" :component="Close" size="24" />
            </div>
          </n-form-item>
        </n-form>
      </n-tab-pane>
    </n-tabs>

    <!-- test result alert-->
    <n-alert v-if="showTestConnSuccResult" title="" type="success">
      {{ $t('conn_test_succ') }}
    </n-alert>
    <n-alert v-if="showTestConnFailResult" title="" type="error">
      {{ $t('conn_test_fail') }}: {{ testResult }}
    </n-alert>

<!--     是否显示进度条  :loading=-->
<!--    #action v-slot 句听话-->
    <template v-slot:action>
      <div class="flex-item-expand">
        <n-button :loading="loading" @click="onTestConnection">{{ $t('conn_test') }}</n-button>
      </div>
      <div class="flex-item n-dialog__action">
        <n-button @click="onClose">{{ $t('cancel') }}</n-button>
        <n-button type="primary" @click="onSaveConnection">
          {{ isEditMode ? $t('update') : $t('confirm') }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<style lang="scss" scoped>
.color-preset-item {
  width: 24px;
  height: 24px;
  margin-right: 2px;
  border: white 3px solid;
  cursor: pointer;

  &_selected,
  &:hover {
    border-color: #cdd0d6;
  }
}
</style>
