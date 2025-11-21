<script setup lang="ts">
import { computed, h, reactive, ref, Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ContentToolbar from '../ContentToolbar.vue'
import AddLink from '../icons/AddLink.vue'
import { NButton, NCode, NIcon, NInput, useMessage, DataTableColumn, DataTableRowKey } from 'naive-ui'
import { types, types as redisTypes } from '../../consts/support_redis_type.js'
import EditableTableColumn from '../EditableTableColumn.vue'
import useConnectionStore from '../../stores/connection.js'
import useDialogStore from '../../stores/dialog.js'
import type { PropType } from 'vue'

interface HashValue {
  [key: string]: string
}

interface FilterOption {
  value: number
  label: string
}

interface TableRow {
  no: number
  key: string
  value: string
}

interface CurrentEditRow {
  no: number
  key: string
  value: string | null
}

const i18n = useI18n()

const filterOption: FilterOption[] = [
  {
    value: 1,
    label: i18n.t('field'),
  },
  {
    value: 2,
    label: i18n.t('value'),
  },
]

const filterType = ref<number>(1)

const props = defineProps({
  name: String,
  db: Number,
  keyPath: String,
  ttl: {
    type: Number,
    default: -1,
  },
  value: {
    type: Object as PropType<HashValue>,
    default: () => ({}),
  },
})

const connectionStore = useConnectionStore()
const dialogStore = useDialogStore()
const keyType = redisTypes.HASH

const currentEditRow = ref<CurrentEditRow>({
  no: 0,
  key: '',
  value: null,
})

const fieldColumn = reactive<DataTableColumn<TableRow>>({
  key: 'key',
  title: i18n.t('field'),
  align: 'center',
  titleAlign: 'center',
  resizable: true,
  filterOptionValue: null,
  filter(value, row) {
    return !!~row.key.indexOf(value.toString())
  },
  render: (row) => {
    const isEdit = currentEditRow.value.no === row.no
    if (isEdit) {
      return h(NInput, {
        value: currentEditRow.value.key,
        'onUpdate:value': (val: string) => {
          currentEditRow.value.key = val
        },
      })
    } else {
      return row.key
    }
  },
})

const valueColumn = reactive<DataTableColumn<TableRow>>({
  key: 'value',
  title: i18n.t('value'),
  align: 'center',
  titleAlign: 'center',
  resizable: true,
  // filterOptionValue: null,
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
      bindKey: row.key,
      onEdit: () => {
        currentEditRow.value.no = row.no
        currentEditRow.value.key = row.key
        currentEditRow.value.value = row.value
      },
      onDelete: async () => {
        try {
          const { success, msg } = await connectionStore.removeHashField(
              props.name!,
              props.db!,
              props.keyPath!,
              row.key
          )
          if (success) {
            connectionStore.loadKeyValue(props.name!, props.db!, props.keyPath!).then((r) => {})
            message.success(i18n.t('delete_key_succ', { key: row.key }))
          } else {
            message.error(msg|| i18n.t('delete_key_fail'))
          }
        } catch (e: any) {
          message.error(e.message)
        }
      },
      onSave: async () => {
        try {
          const { success, msg } = await connectionStore.setHash(
              props.name!,
              props.db!,
              props.keyPath!,
              row.key,
              currentEditRow.value.key,
              currentEditRow.value.value || ''
          )
          if (success) {
            connectionStore.loadKeyValue(props.name!, props.db!, props.keyPath!).then((r) => {})
            message.success(i18n.t('save_value_succ'))
          } else {
            message.error(msg|| i18n.t('delete_key_fail'))
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
  fieldColumn,
  valueColumn,
  actionColumn,
])

const tableData = computed<TableRow[]>(() => {
  const data: TableRow[] = []
  let index = 0
  for (const key in props.value) {
    data.push({
      no: ++index,
      key,
      value: props.value[key],
    })
  }
  return data
})

const message = useMessage()

const onAddRow = () => {
  dialogStore.openAddFieldsDialog(props.name!, props.db!, props.keyPath!, types.HASH)
}

const filterValue = ref<string>('')

const onFilterInput = (val: string) => {
  switch (filterType.value) {
    case filterOption[0].value:
      // valueColumn.filterOptionValue = null
      // fieldColumn.filterOptionValue = val
      break
    case filterOption[1].value:
      // fieldColumn.filterOptionValue = null
      // valueColumn.filterOptionValue = val
      break
  }
}

const onChangeFilterType = (type: number) => {
  onFilterInput(filterValue.value)
}

const clearFilter = () => {
  // fieldColumn.filterOptionValue = null
  // valueColumn.filterOptionValue = null
}

const onUpdateFilter = (filters: Record<string, string>, sourceColumn: DataTableColumn<TableRow>) => {
  switch (filterType.value) {
    case filterOption[0].value:
      // fieldColumn.filterOptionValue = filters[sourceColumn.key as string]
      break
    case filterOption[1].value:
      // valueColumn.filterOptionValue = filters[sourceColumn.key as string]
      break
  }
}
</script>

<template>
  <div class="content-wrapper flex-box-v">
    <content-toolbar :db="props.db" :key-path="props.keyPath" :key-type="keyType" :server="props.name" :ttl="ttl" />
    <div class="tb2 flex-box-h">
      <div class="flex-box-h">
        <n-input-group>
          <n-select
              v-model:value="filterType"
              :consistent-menu-width="false"
              :options="filterOption"
              style="width: 120px"
              @update:value="onChangeFilterType"
          />
          <n-input
              v-model:value="filterValue"
              :placeholder="$t('search')"
              clearable
              @clear="clearFilter"
              @update:value="onFilterInput"
          />
        </n-input-group>
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
