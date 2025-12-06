<script setup lang="ts">
import { ref } from 'vue'
import { compact } from 'lodash'
import Add from '../icons/Add.vue'
import Delete from '../icons/Delete.vue'
import IconButton from '../common/IconButton.vue'
import { useI18n } from 'vue-i18n'
import type { PropType } from 'vue'

interface InsertOption {
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

const insertOption: InsertOption[] = [
  {
    value: 0,
    label: i18n.t('append_item'),
  },
  {
    value: 1,
    label: i18n.t('prepend_item'),
  },
]

const list = ref<string[]>([''])

const onUpdate = (val: string[]) => {
  val = compact(val)
  emit('update:value', val)
}
</script>

<template>
  <n-form-item :label="$t('type')">
    <n-radio-group :value="props.type" @update:value="(val:  number) => emit('update:type', val)">
      <n-radio-button v-for="(op, i) in insertOption" :key="i" :label="op.label" :value="op.value" />
    </n-radio-group>
  </n-form-item>
  <n-form-item :label="$t('element')" required>
    <n-dynamic-input
        v-model:value="list"
        :placeholder="$t('enter_elem')"
        @update:value="onUpdate">
      <template #action="{ index, create, remove, move }">
        <icon-button v-if="list.length > 1" :icon="Delete" size="18" @click="() => remove(index)" />
        <icon-button :icon="Add" size="18" @click="() => create(index)" />
      </template>
    </n-dynamic-input>
  </n-form-item>
</template>

<style lang="scss" scoped></style>
