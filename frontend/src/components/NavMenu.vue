<script setup lang="ts">
import { computed, h, ref, Ref } from 'vue'
import { NIcon, useThemeVars, MenuOption, DropdownOption } from 'naive-ui'
import ToggleDb from './icons/ToggleDb.vue'
import { useI18n } from 'vue-i18n'
import ToggleServer from './icons/ToggleServer.vue'
import IconButton from './IconButton.vue'
import Config from './icons/Config.vue'
import useDialogStore from '../stores/dialog'
import Github from './icons/Github.vue'
import { BrowserOpenURL } from '../../wailsjs/runtime'

// 类型定义
type MenuItemKey = 'structure' | 'server' | 'preferences' | 'about' | 'update'

const themeVars = useThemeVars()

const iconSize = 26
const selectedMenu: Ref<MenuItemKey> = ref('server')

// 渲染图标函数
const renderIcon = (icon: any) => {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const i18n = useI18n()

// 主菜单选项, 计算属性，必函数强的点是只有监听的变量改变时才会重新计算
const menuOptions = computed<MenuOption[]>(() => {
  return [
    {
      label: i18n.t('structure'),
      key: 'structure',
      icon: renderIcon(ToggleDb),
      show: true,
    },
    {
      label: i18n.t('server'),
      key: 'server',
      icon: renderIcon(ToggleServer),
    },
  ]
})

// 偏好设置菜单选项, 计算属性，只有监听的变量改变时才会重新计算
const preferencesOptions = computed<DropdownOption[]>(() => {
  return [
    {
      label: i18n.t('preferences'),
      key: 'preferences',
      icon: renderIcon(Config),
    },
    {
      label: i18n.t('about'),
      key: 'about',
    },
    {
      label: i18n.t('check_update'),
      key: 'update',
    },
  ]
})

// 渲染上下文标签, 函数组件，返回一个 VNode
const renderContextLabel = (option: DropdownOption) => {
  return h('div', { class: 'context-menu-item' }, option.label as string)
}

const dialogStore = useDialogStore()

// 处理偏好设置菜单选择, 函数，根据选择的菜单项执行相应的操作
const onSelectPreferenceMenu = (key: MenuItemKey) => {
  switch (key) {
    case 'preferences':
      dialogStore.openPreferencesDialog()
      break
    case 'update':
      break
  }
}

// 打开 GitHub 页面
const openGithub = () => {
  BrowserOpenURL('https://github.com/tiny-craft/tiny-rdm')
}
</script>

<template>
  <div id="app-nav-menu" class="flex-box-v">
    <n-menu
        v-model:value="selectedMenu"
        :collapsed="true"
        :collapsed-icon-size="iconSize"
        :collapsed-width="60"
        :options="menuOptions"
    ></n-menu>
    <div class="flex-item-expand"></div>
    <div class="nav-menu-item flex-box-v">
      <n-dropdown
          :animated="false"
          :keyboard="false"
          :options="preferencesOptions"
          :render-label="renderContextLabel"
          trigger="click"
          @select="onSelectPreferenceMenu"
      >
        <icon-button :icon="Config" :size="iconSize" class="nav-menu-button" />
      </n-dropdown>
      <icon-button :icon="Github" :size="iconSize" class="nav-menu-button" @click="openGithub"></icon-button>
    </div>
  </div>
</template>

<style lang="scss">
#app-nav-menu {
  width: 60px;
  height: 100vh;
  border-right: var(--border-color) solid 1px;

  .nav-menu-item {
    align-items: center;
    padding: 10px 0;
    gap: 15px;

    .nav-menu-button {
      margin-bottom: 6px;

      :hover {
        color: v-bind('themeVars.primaryColor');
      }
    }
  }
}
</style>
