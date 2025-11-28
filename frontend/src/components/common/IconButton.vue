<script setup lang="ts">
import type {Component} from 'vue'
import {computed} from 'vue'
import {NIcon} from 'naive-ui'
import {booleanLiteral} from "@babel/types";
import {types} from "sass";
import Boolean = types.Boolean;

interface Props {
  tooltip?: string
  tTooltip?: string
  icon?: Component
  size?: number | string
  color?: string
  strokeWidth?: number | string
  border?: boolean
  disabled?: boolean
}

const emit = defineEmits<{
  (e: 'click'): void
  // click: []  vue3
}>()

const props = withDefaults(defineProps<Props>(), {
  tooltip: '',
  tTooltip: '',
  icon: () => {},
  size: 20,
  color: 'currentColor',
  strokeWidth: 3,
  border: false,
  disabled: false
})

const hasTooltip = computed(() => {
  return props.tooltip || props.tTooltip
})


</script>

<template>
  <n-tooltip v-if="hasTooltip">
    <template #trigger>
      <n-button :text="!border" :disabled="disabled" @click="emit('click')">
        <n-icon :size="props.size" :color="props.color">
          <component :is="props.icon" :stroke-width="props.strokeWidth" />
        </n-icon>
      </n-button>
    </template>
    {{ props.tTooltip ? $t(props.tTooltip) : props.tooltip }}
  </n-tooltip>
  <n-button v-else :text="!border" :disabled="disabled" @click="emit('click')">
    <n-icon :size="props.size" :color="props.color">
      <component :is="props.icon" :stroke-width="props.strokeWidth" />
    </n-icon>
  </n-button>
</template>

<style scoped lang="scss">

</style>