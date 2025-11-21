<script setup lang="ts">
import { NInput } from 'naive-ui'
import type { PropType } from 'vue'

interface Props {
  isEdit?: boolean
  value?: string | [string, string] | null | undefined
  onUpdateValue?: Function | Array<any>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:value', val: string | number): void
}>()

const handleUpdateValue = (val: string | number) => {
  emit('update:value', val)
}
</script>

<template>
  <div style="min-height: 22px">
    <template v-if="props.isEdit">
      <!-- TODO: ADD FULL SCREEN EDIT SUPPORT -->
      <n-input :value="props.value" @update:value="handleUpdateValue" />
    </template>
    <template v-else>
      {{ props.value }}
    </template>
  </div>
</template>
