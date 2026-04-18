import { h } from 'vue'
import type { Component, VNode } from 'vue'
import { NIcon } from 'naive-ui'

export function useRender() {
  return {
    renderIcon: (icon: Component | null | undefined, props: Record<string, unknown> = {}): VNode | undefined => {
      if (icon == null) {
        return undefined
      }
      return h(NIcon, null, {
        default: () => h(icon, props),
      })
    },

    renderLabel: (label: string, props: Record<string, unknown> = {}): VNode => {
      return h('div', props, label)
    },
  }
}
