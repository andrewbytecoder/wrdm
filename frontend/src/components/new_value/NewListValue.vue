<script setup lang="ts">
import { ref } from 'vue'
import { compact } from 'lodash'
import Add from '../icons/Add.vue'
import Delete from '../icons/Delete.vue'
import IconButton from '../common/IconButton.vue'
import type { PropType } from 'vue'

const props = defineProps({
  value: {
    type: Array as PropType<Array<string>>,
    default: () => []
  }
})

const emit = defineEmits<{
  (e: 'update:value', value: Array<string>): void
}>()

const list = ref<string[]>([''])

const onUpdate = (val: string[]) => {
  val = compact(val)
  emit('update:value', val)
}
</script>

<template>
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
