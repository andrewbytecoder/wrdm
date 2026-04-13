<script setup lang="ts">
import { ref } from 'vue'
import { flatMap, isEmpty, reject } from 'lodash'
import Add from '@/components/icons/Add.vue'
import Delete from '@/components/icons/Delete.vue'
import IconButton from '@/components/common/IconButton.vue'
import type { PropType } from 'vue'

interface ZSetItem {
  value: string
  score: number
}

const props = defineProps({
  value: {
    type: Array as PropType<Array<string | number>>,
    default: () => []
  }
})

const emit = defineEmits<{
  (e: 'update:value', value: Array<string | number>): void
}>()

const zset = ref<ZSetItem[]>([{ value: '', score: 0 }])

const onCreate = (): ZSetItem => {
  return {
    value: '',
    score: 0,
  }
}

defineExpose({
  validate: () => {
    return !isEmpty(props.value)
  },
})

const onUpdate = (): void => {
  const val = reject(zset.value, (v) => v == null || isEmpty(v.value)) as ZSetItem[]
  emit(
      'update:value',
      flatMap(val, (item) => [item.value, item.score.toString()])
  )
}

defineExpose({
  validate: () => {
    return !isEmpty(props.value)
  },
})

</script>

<template>
    <n-form-item :label="$t('element')" required>
        <n-dynamic-input v-model:value="zset" @create="onCreate" @update:value="onUpdate">
            <template #default="{ value }">
                <n-input
                    v-model:value="value.value"
                    :placeholder="$t('enter_member')"
                    type="text"
                    @update:value="onUpdate"
                />
                <n-input-number v-model:value="value.score" :placeholder="$t('enter_score')" @update:value="onUpdate" />
            </template>
            <template #action="{ index, create, remove, move }">
                <icon-button v-if="zset.length > 1" :icon="Delete" size="18" @click="() => remove(index)" />
                <icon-button :icon="Add" size="18" @click="() => create(index)" />
            </template>
        </n-dynamic-input>
    </n-form-item>
</template>

<style lang="scss"></style>
