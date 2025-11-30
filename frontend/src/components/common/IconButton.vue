<script setup lang="ts">
import type {Component} from 'vue'
import {computed} from 'vue'
import {NIcon} from 'naive-ui'
import {booleanLiteral} from "@babel/types";
import {types} from "sass";
import Boolean = types.Boolean;

interface Props {
  tooltip: string
  tTooltip: string
  icon?: Component
  size?: number | string
  color?: string
  strokeWidth?: number | string
  border: boolean
  disabled?: boolean
}

const emit = defineEmits<{
  click: [],
  // (e: 'click'): void
  // click: []  vue3
}>()

//  v-model 只是用来透传 input和update类型数据的语法糖，不适合click事件
// const click = defineModel('click')

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
<!--  是否鼠标放上去有提示-->
  <n-tooltip v-if="hasTooltip">
    <template #trigger>
      <n-button :text="!props.border" :disabled="props.disabled" @click="emit('click')">
        <n-icon :size="props.size" :color="props.color">
          <component :is="props.icon" :stroke-width="props.strokeWidth" />
        </n-icon>
      </n-button>
    </template>
<!--    如果需要转换，优先使用能够进行国际化语言的变量进行显示-->
    {{ props.tTooltip ? $t(props.tTooltip) : props.tooltip }}
  </n-tooltip>
  <n-button v-else :text="!props.border" :disabled="props.disabled" @click="emit('click')">
    <n-icon :size="props.size" :color="props.color">
      <component :is="props.icon" :stroke-width="props.strokeWidth" />
    </n-icon>
  </n-button>
</template>

<style scoped lang="scss">

</style>