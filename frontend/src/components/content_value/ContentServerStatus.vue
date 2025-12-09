<script setup lang="ts">
import { get, map, mapValues, pickBy, split, sum, toArray, toNumber } from 'lodash'
import type { DataTableColumns, DataTableInst } from 'naive-ui'
import { computed, reactive, ref } from 'vue'
import Help from '../icons/Help.vue'
import IconButton from '../common/IconButton.vue'
import Filter from '../icons/Filter.vue'
import { useI18n } from 'vue-i18n'
import {FilterOptionValue} from "naive-ui/es/data-table/src/interface";
import {nullLiteral} from "@babel/types";


interface ServerStatus {
  server: string
  info: Record<string, string>
  autoRefresh: boolean
}

const props = defineProps<ServerStatus>()

const emit = defineEmits(['update:autoRefresh'])

const redisVersion = computed(() => {
  return get(props.info, 'redis_version', '')
})

const redisMode = computed(() => {
  return get(props.info, 'redis_mode', '')
})

const role = computed(() => {
  return get(props.info, 'role', '')
})

const timeUnit = ['unit_minute', 'unit_hour', 'unit_day']
const uptime = computed((): [number, string] => {
    let seconds = parseInt(get(props.info, 'uptime_in_seconds', 0).toString(), 10)
    seconds /= 60
    if (seconds < 60) {
      // minutes
      return [Math.floor(seconds), timeUnit[0]] as [number, string]
    }
    seconds /= 60
    if (seconds < 60) {
      // hours
      return [Math.floor(seconds), timeUnit[1]] as [number, string]
    }
    return [Math.floor(seconds / 24), timeUnit[2]] as [number, string]
})

const units = ['B', 'KB', 'MB', 'GB', 'TB']
const usedMemory = computed(() => {
  let size = parseInt(get(props.info, 'used_memory', 0).toString(), 10)
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return [size.toFixed(2), units[unitIndex]]
})

const totalKeys = computed(() => {
  const regex = /^db\d+$/
  const result = pickBy(props.info, (value, key) => {
    return regex.test(key)
  })
  const nums = mapValues(result, (v) => {
    const keys = split(v, ',', 1)[0]
    const num = split(keys, '=', 2)[1]
    return toNumber(num)
  })
  return sum(toArray(nums))
})

const infoList = computed(() => map(props.info, (value, key) => ({ value, key })))

const i18n = useI18n()

interface RowData {
  key: string
  value: string | number
}

const infoColumns: DataTableColumns<RowData> = [
  reactive({
    title: i18n.t('key'),
    key: 'key',
    defaultSortOrder: 'ascend',
    sorter: 'default',
    minWidth: 100,
    filterOptionValue: null,
    filter(value, row) {
      return row.key.includes(value as string)
    },
  }),
  { title: i18n.t('value'), key: 'value' },
]
const infoFilter = ref('')

const onFilterInfo = (val: string) => {
  infoFilter.value = val
}

</script>

<template>
  <n-scrollbar>
    <n-space vertical>
      <n-card :theme-override1s="{ paddingMedium: '10px 20px 10px' }">
        <template #header>
          {{ props.server }}
          <n-space inline size="small">
            <n-tag v-if="redisVersion" type="primary" size="small">v{{ redisVersion }}</n-tag>
            <n-tag v-if="redisMode" type="primary" size="small">{{ redisMode }}</n-tag>
            <n-tag v-if="role" type="primary" size="small">{{ role }}</n-tag>
          </n-space>
        </template>
        <template #header-extra>
          <n-space inline size="small">
            {{ $t('auto_refresh') }}
            <n-switch :value="props.autoRefresh" @update:value="(v: boolean) => emit('update:autoRefresh', v)" />
          </n-space>
        </template>
        <n-grid x-gap="5" style="min-width: 500px">
          <n-gi :span="6">
            <n-statistic :label="$t('uptime')" :value="uptime[0]">
              <template #suffix> {{ $t(uptime[1]) }}</template>
            </n-statistic>
          </n-gi>
          <n-gi :span="6">
            <n-statistic
                :label="$t('connected_clients')"
                :value="get(props.info, 'connected_clients', 0)"
            />
          </n-gi>
          <n-gi :span="6">
            <n-statistic :value="totalKeys">
              <template #label
              >{{ $t('total_keys') }}
                <n-icon :component="Help" />
              </template>
            </n-statistic>
          </n-gi>
          <n-gi :span="6">
            <n-statistic :label="$t('memory_used')" :value="usedMemory[0]">
              <template #suffix> {{ usedMemory[1] }}</template>
            </n-statistic>
          </n-gi>
        </n-grid>
      </n-card>
      <n-card :title="$t('all_info')">
        <template #header-extra>
          <n-input v-model:value="infoFilter" @update:value="onFilterInfo" placeholder="">
            <template #prefix>
              <icon-button :icon="Filter" size="18" />
            </template>
          </n-input>
        </template>
        <n-data-table
            :columns="infoColumns"
            :data="infoList"
            :pattern="infoFilter"
        />
      </n-card>
    </n-space>
  </n-scrollbar>
</template>

<style scoped lang="scss"></style>
