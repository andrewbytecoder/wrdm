<script setup lang="ts">
import type {Component} from 'vue'
import {computed} from 'vue'
import {NIcon} from 'naive-ui'

interface Props {
  tooltip?: string
  tTooltip?: string
  icon?: Component
  size?: number | string
  color?: string
  strokeWidth?: number | string
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
  disabled: false
})

const disableColor = computed((): string => {
  const baseColor = props.color
  const grayScale = Math.round(
      0.299 * parseInt(baseColor.substring(1, 2), 16) +
      0.587 * parseInt(baseColor.substring(3, 2), 16) +
      0.114 * parseInt(baseColor.substring(5, 2), 16)
  )
  return `#${grayScale.toString(16).repeat(3)}`
})

const hasTooltip = computed(() => {
  return props.tooltip || props.tTooltip
})


</script>

<template>
  <n-tooltip v-if="hasTooltip">
    <template #trigger>
      <n-button text :disabled="disabled" @click="emit('click')">
        <n-icon :size="props.size" :color="props.color">
          <component :is="props.icon" :stroke-width="props.strokeWidth" />
        </n-icon>
      </n-button>
    </template>
    {{ props.tTooltip ? $t(props.tTooltip) : props.tooltip }}
  </n-tooltip>
  <n-button v-else text :disabled="disabled" @click="emit('click')">
    <n-icon :size="props.size" :color="props.color">
      <component :is="props.icon" :stroke-width="props.strokeWidth" />
    </n-icon>
  </n-button>
</template>

<style scoped lang="scss">

</style>