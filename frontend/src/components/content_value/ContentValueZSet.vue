<script setup lang="ts">
import { computed, h, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ContentToolbar from '@/components/content_value/ContentToolbar.vue'
import AddLink from '@/components/icons/AddLink.vue'
import { NButton, NCode, NIcon, NInput, NInputNumber, useMessage, DataTableColumn } from 'naive-ui'
import { types, types as redisTypes } from '@/consts/support_redis_type'
import EditableTableColumn from '@/components/common/EditableTableColumn.vue'
import useConnectionStore from '@/stores/connections'
import { isEmpty, replace } from 'lodash'
import useDialogStore from '@/stores/dialog'

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

interface TableColumn {
  key: string
  title: string
  align: string
  titleAlign: string
  resizable: boolean
  filterOptionValue: string | null
  filter: (value: string, row: TableRow) => boolean
  render?: (row: TableRow) => any
  width?: number
  fixed?: string
}
const i18n = useI18n()


interface Props {
  name: string
  db: number
  keyPath: string
  ttl?: number
  value: ZSetValueArray
}

const props = withDefaults(defineProps<Props>(), {
  ttl: -1
})


const filterOption = computed(() => [
  {
    value: 1,
    label: i18n.t('value'),
  },
  {
    value: 2,
    label: i18n.t('score'),
  },
])
const filterType = ref<number>(1)


const connectionStore = useConnectionStore()
const dialogStore = useDialogStore()
const keyType = redisTypes.ZSET

const currentEditRow = ref<CurrentEditRow>({
  no: 0,
  score: 0,
  value: null,
})

const scoreColumn = reactive<TableColumn>({
  key: 'score',
  title: i18n.t('score'),
  align: 'center',
  titleAlign: 'center',
  resizable: true,
  filterOptionValue: null,
  filter(value: string, row: TableRow) {
    const score = parseFloat(String(row.score))
    if (isNaN(score)) {
      return true
    }

    const regex = /^(>=|<=|>|<|=|!=)?(\d+(\.\d*)?)?$/
    const matches = value.match(regex)
    if (matches) {
      const operator = matches[1] || ''
      const filterScore = parseFloat(matches[2] || '')
      if (!isNaN(filterScore)) {
        switch (operator) {
          case '>=':
            return score >= filterScore
          case '<=':
            return score <= filterScore
          case '>':
            return score > filterScore
          case '<':
            return score < filterScore
          case '=':
            return score === filterScore
          case '!=':
            return score !== filterScore
        }
      }
    } else {
      return !!~row.value.indexOf(value.toString())
    }

    return true
  },
  render(row: TableRow) {
    const isEdit = currentEditRow.value.no === row.no
    if (isEdit) {
      return h(NInputNumber, {
        value: currentEditRow.value.score,
        'onUpdate:value': (val) => {
          currentEditRow.value.score = val as number
        },
      })
    } else {
      return row.score
    }
  },
})

const valueColumn = reactive<TableColumn>({
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

const actionColumn: TableColumn = {
  key: 'action',
  title: i18n.t('action'),
  width: 100,
  align: 'center',
  resizable: true,
  titleAlign: 'center',
  fixed: 'right',
  filterOptionValue: null,
  filter() {
    return true
  },
  render(row: TableRow) {
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
              props.name,
              props.db,
              props.keyPath,
              row.value
          )
          if (success) {
            connectionStore.loadKeyValue(props.name, props.db, props.keyPath).then((r) => {})
            message.success(i18n.t('delete_key_succ', { key: row.value }))
          } else {
            message.error(msg || "delete failed")
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
              props.name,
              props.db,
              props.keyPath,
              row.value,
              newValue ||  '',
              currentEditRow.value.score
          )
          if (success) {
            connectionStore.loadKeyValue(props.name, props.db, props.keyPath).then((r) => {})
            message.success(i18n.t('save_value_succ'))
          } else {
            message.error(msg || "load value failed")
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

const columns = reactive<TableColumn[]>([
  {
    key: 'no',
    title: '#',
    width: 80,
    align: 'center',
    resizable: true,
    titleAlign: 'center',
    filterOptionValue: null,
    filter() {
      return true
    },
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
  switch (filterType.value) {
    case filterOption.value[0].value:
      scoreColumn.filterOptionValue = null
      valueColumn.filterOptionValue = val
      break
    case filterOption.value[1].value:
      scoreColumn.filterOptionValue = null
      valueColumn.filterOptionValue = val
      break
  }
}

const onChangeFilterType = (type: number) => {
  onFilterInput(filterValue.value)
}

const clearFilter = () => {
  //  reactive类型的数据可自动解引用
  valueColumn.filterOptionValue = null
  scoreColumn.filterOptionValue = null
}

const onUpdateFilter = (filters: Record<string, string>, sourceColumn: TableColumn) => {
  switch (filterType.value) {
    case filterOption.value[0].value:
      // filter value
      valueColumn.filterOptionValue = filters[sourceColumn.key]
      break
    case filterOption.value[1].value:
      // filter score
      scoreColumn.filterOptionValue = filters[sourceColumn.key]
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
                    <n-tooltip :disabled="filterType !== 2" :delay="500">
                        <template #trigger>
                            <n-input
                                v-model:value="filterValue"
                                :placeholder="$t('search')"
                                clearable
                                @clear="clearFilter"
                                @update:value="onFilterInput"
                            />
                        </template>
                        <div class="text-block">{{ $t('score_filter_tip') }}</div>
                    </n-tooltip>
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
