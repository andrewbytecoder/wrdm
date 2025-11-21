<script setup lang="ts">
import type { PropType } from 'vue'

const props = defineProps({
  value: {
    type: String,
    default: ''
  }
})

const emit = defineEmits<{
  (e: 'update:value', value: string): void
}>()
</script>

<template>
  <n-form-item :label="$t('value')">
    <n-input
        :rows="6"
        :value="props.value"
        placeholder=""
        type="textarea"
        @input="(val:  string) => emit('update:value', val)"
    />
  </n-form-item>
</template>

<style lang="scss" scoped></style>
