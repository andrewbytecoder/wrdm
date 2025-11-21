<script setup lang="ts">
import { ref } from 'vue'
import { flatMap, reject } from 'lodash'
import Add from '../icons/Add.vue'
import Delete from '../icons/Delete.vue'
import IconButton from '../IconButton.vue'
import { useI18n } from 'vue-i18n'
import type { PropType } from 'vue'

interface Hash {
  key: string
  value: string
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
    type: Array as PropType<Array<string>>,
    default: () => []
  }
})

const emit = defineEmits<{
  (e: 'update:value', value: Array<string>): void
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

const kvList = ref<Hash[]>([{ key: '', value: '' }])

const onUpdate = (val: Hash[]) => {
  val = reject(val, { key: '' }) as Hash[]
  emit(
      'update:value',
      flatMap(val, (item) => [item.key, item.value])
  )
}
</script>

<template>
  <n-form-item :label="$t('type')">
    <n-radio-group :value="props.type" @update:value="(val: number) => emit('update:type', val)">
      <n-radio-button v-for="(op, i) in updateOption" :key="i" :label="op.label" :value="op.value" />
    </n-radio-group>
  </n-form-item>
  <n-form-item :label="$t('element')" required>
    <n-dynamic-input
        v-model:value="kvList"
        :key-placeholder="$t('enter_field')"
        :value-placeholder="$t('enter_value')"
        preset="pair"
        @update:value="onUpdate"
    >
      <template #action="{ index, create, remove }">
        <icon-button v-if="kvList.length > 1" :icon="Delete" size="18" @click="() => remove(index)" />
        <icon-button :icon="Add" size="18" @click="() => create(index)" />
      </template>
    </n-dynamic-input>
  </n-form-item>
</template>

<style lang="scss" scoped></style>
