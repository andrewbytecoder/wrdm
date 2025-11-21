<script setup lang="ts">
import { computed, h, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ContentToolbar from '../ContentToolbar.vue'
import AddLink from '../icons/AddLink.vue'
import { NButton, NCode, NIcon, NInput, NInputNumber, useMessage, DataTableColumn } from 'naive-ui'
import { types, types as redisTypes } from '../../consts/support_redis_type.js'
import EditableTableColumn from '../EditableTableColumn.vue'
import useConnectionStore from '../../stores/connection.js'
import { isEmpty } from 'lodash'
import useDialogStore from '../../stores/dialog.js'
import type { PropType } from 'vue'

interface ZSetValue {
  value: string
  score: number
}

interface ZSetValueArray extends Array<ZSetValue> {}

interface TableRow {
  no: number
  value: string
  score: number
}

interface CurrentEditRow {
  no: number
  score: number
  value: string | null
}

const i18n = useI18n()

const props = defineProps({
  name: String,
  db: Number,
  keyPath: String,
  ttl: {
    type: Number,
    default: -1,
  },
  value: {
    type: Array as PropType<ZSetValueArray>,
    default: () => [],
  },
})

const connectionStore = useConnectionStore()
const dialogStore = useDialogStore()
const keyType = redisTypes.ZSET

const currentEditRow = ref<CurrentEditRow>({
  no: 0,
  score: 0,
  value: null,
})

const scoreColumn = reactive<DataTableColumn<TableRow>>({
  key: 'score',
  title: i18n.t('score'),
  align: 'center',
  titleAlign: 'center',
  resizable: true,
  render: (row) => {
    const isEdit = currentEditRow.value.no === row.no
    if (isEdit) {
      return h(NInputNumber, {
        value: currentEditRow.value.score,
        'onUpdate:value': (val: number| null) => {
          currentEditRow.value.score = val || 0
        },
      })
    } else {
      return row.score
    }
  },
})

const valueColumn = reactive<DataTableColumn<TableRow>>({
  key: 'value',
  title: i18n.t('value'),
  align: 'center',
  titleAlign: 'center',
  resizable: true,
  filterOptionValue: null,
  filter(value, row) {
    return !!~row.value.indexOf(value.toString())
  },
  render: (row) => {
    const isEdit = currentEditRow.value.no === row.no
    if (isEdit) {
      return h(NInput, {
        value: currentEditRow.value.value || '',
        type: 'textarea',
        autosize: { minRows: 2, maxRows: 5 },
        style: 'text-align: left;',
        'onUpdate:value': (val: string) => {
          currentEditRow.value.value = val
        },
      })
    } else {
      return h(NCode, { language: 'plaintext', wordWrap: true }, { default: () => row.value })
    }
  },
})

const actionColumn: DataTableColumn<TableRow> = {
  key: 'action',
  title: i18n.t('action'),
  width: 100,
  align: 'center',
  titleAlign: 'center',
  fixed: 'right',
  render: (row) => {
    return h(EditableTableColumn, {
      editing: currentEditRow.value.no === row.no,
      bindKey: row.value,
      onEdit: () => {
        currentEditRow.value.no = row.no
        currentEditRow.value.value = row.value
        currentEditRow.value.score = row.score
      },
      onDelete: async () => {
        try {
          const { success, msg } = await connectionStore.removeZSetItem(
              props.name!,
              props.db!,
              props.keyPath!,
              row.value
          )
          if (success) {
            connectionStore.loadKeyValue(props.name!, props.db!, props.keyPath!).then((r) => {})
            message.success(i18n.t('delete_key_succ', { key: row.value }))
          } else {
            message.error(msg || i18n.t('delete_key_fail'))
          }
        } catch (e: any) {
          message.error(e.message)
        }
      },
      onSave: async () => {
        try {
          const newValue = currentEditRow.value.value
          if (isEmpty(newValue)) {
            message.error(i18n.t('spec_field_required', { key: i18n.t('value') }))
            return
          }
          const { success, msg } = await connectionStore.updateZSetItem(
              props.name!,
              props.db!,
              props.keyPath!,
              row.value,
              newValue || '',
              currentEditRow.value.score
          )
          if (success) {
            connectionStore.loadKeyValue(props.name!, props.db!, props.keyPath!).then((r) => {})
            message.success(i18n.t('save_value_succ'))
          } else {
            message.error(msg || i18n.t('save_value_fail'))
          }
        } catch (e: any) {
          message.error(e.message)
        } finally {
          currentEditRow.value.no = 0
        }
      },
      onCancel: () => {
        currentEditRow.value.no = 0
      },
    })
  },
}

const columns = reactive<DataTableColumn<TableRow>[]>([
  {
    key: 'no',
    title: '#',
    width: 80,
    align: 'center',
    titleAlign: 'center',
  },
  valueColumn,
  scoreColumn,
  actionColumn,
])

const tableData = computed<TableRow[]>(() => {
  const data: TableRow[] = []
  let index = 0
  for (const elem of props.value) {
    data.push({
      no: ++index,
      value: elem.value,
      score: elem.score,
    })
  }
  return data
})

const message = useMessage()

const onAddRow = () => {
  dialogStore.openAddFieldsDialog(props.name!, props.db!, props.keyPath!, types.ZSET)
}

const filterValue = ref<string>('')

const onFilterInput = (val: string) => {
  // valueColumn.filterOptionValue = val
}

const onChangeFilterType = (type: number) => {
  onFilterInput(filterValue.value)
}

const clearFilter = () => {
  // valueColumn.filterOptionValue = null
}

const onUpdateFilter = (filters: Record<string, string>, sourceColumn: DataTableColumn<TableRow>) => {
  // valueColumn.filterOptionValue = filters[sourceColumn.key as string]
}
</script>

<template>
  <div class="content-wrapper flex-box-v">
    <content-toolbar :db="props.db" :key-path="props.keyPath" :key-type="keyType" :server="props.name" :ttl="ttl" />
    <div class="tb2 flex-box-h">
      <div class="flex-box-h">
        <n-input
            v-model:value="filterValue"
            :placeholder="$t('search')"
            clearable
            @clear="clearFilter"
            @update:value="onFilterInput"
        />
      </div>
      <div class="flex-item-expand"></div>
      <n-button plain @click="onAddRow">
        <template #icon>
          <n-icon :component="AddLink" size="18" />
        </template>
        {{ $t('add_row') }}
      </n-button>
    </div>
    <div class="fill-height flex-box-h" style="user-select: text">
      <n-data-table
          :key="(row: TableRow) => row.no"
          :columns="columns"
          :data="tableData"
          :single-column="true"
          :single-line="false"
          flex-height
          max-height="100%"
          size="small"
          striped
          virtual-scroll
          @update:filters="onUpdateFilter"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
