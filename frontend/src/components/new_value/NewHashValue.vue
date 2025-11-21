<script setup lang="ts">
import { ref } from 'vue'
import { isEmpty, reject } from 'lodash'
import Add from '../icons/Add.vue'
import Delete from '../icons/Delete.vue'
import IconButton from '../IconButton.vue'
import { useI18n } from 'vue-i18n'
import type { PropType } from 'vue'

interface ZSetItem {
  value: string
  score: number
}

interface UpdateOption {
  value: number
  label: string
}

const props = defineProps({
  type: {
    type: Number,
    default: 0
  },
  value: {
    type: Object as PropType<Record<string, number>>,
    default: () => ({})
  }
})

const emit = defineEmits<{
  (e: 'update:value', value: Record<string, number>): void
  (e: 'update:type', type: number): void
}>()

const i18n = useI18n()

const updateOption: UpdateOption[] = [
  {
    value: 0,
    label: i18n.t('overwrite_field'),
  },
  {
    value: 1,
    label: i18n.t('ignore_field'),
  },
]

const zset = ref<ZSetItem[]>([{ value: '', score: 0 }])

const onCreate = (): ZSetItem => {
  return {
    value: '',
    score: 0,
  }
}

const onUpdate = (): void => {
  const val = reject(zset.value, (v) => v == null || isEmpty(v.value)) as ZSetItem[]
  const result: Record<string, number> = {}
  for (const elem of val) {
    result[elem.value] = elem.score
  }
  emit('update:value', result)
}
</script>

<template>
  <n-form-item :label="$t('type')">
    <n-radio-group :value="props.type" @update:value="(val: number) => emit('update:type', val)">
      <n-radio-button v-for="(op, i) in updateOption" :key="i" :label="op.label" :value="op.value" />
    </n-radio-group>
  </n-form-item>
  <n-form-item :label="$t('element')" required>
    <n-dynamic-input v-model:value="zset" @create="onCreate" @update:value="onUpdate">
      <template #default="{ value }">
        <n-input
            v-model:value="value.value"
            :placeholder="$t('enter_elem')"
            type="text"
            @update:value="onUpdate"
        />
        <n-input-number v-model:value="value.score" :placeholder="$t('enter_score')" @update:value="onUpdate" />
      </template>
      <template #action="{ index, create, remove }">
        <icon-button v-if="zset.length > 1" :icon="Delete" size="18" @click="() => remove(index)" />
        <icon-button :icon="Add" size="18" @click="() => create(index)" />
      </template>
    </n-dynamic-input>
  </n-form-item>
</template>

<style lang="scss"></style>
