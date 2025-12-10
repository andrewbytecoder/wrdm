<script setup lang="ts">
import { computed, h, ref, Ref } from 'vue'
import { NIcon, useThemeVars, MenuOption, DropdownOption } from 'naive-ui'
import ToggleDb from '../icons/ToggleDb.vue'
import { useI18n } from 'vue-i18n'
import ToggleServer from '../icons/ToggleServer.vue'
import IconButton from '../common/IconButton.vue'
import Help from '../icons/Help.vue'
import Config from '../icons/Config.vue'
import useDialogStore from '../../stores/dialog'
import Github from '../icons/Github.vue'
import { BrowserOpenURL } from '../../../wailsjs/runtime'
import Log from '../icons/Log.vue'
import useConnectionStore from '../../stores/connections'
import Update from "../icons/Update.vue";
import About from "../icons/About.vue";
import { renderIcon } from '../../utils/render_model'

// 类型定义
type MenuItemKey = 'structure' | 'server' | 'preferences' | 'about' | 'update'

// 使用Naive UI主题变量
const themeVars = useThemeVars()

// // 定义组件接收的props属性
// const props = defineProps({
//   value: {
//     type: String,
//     default: 'server'
//   },
//   width: {
//     type: Number,
//     default: 60
//   },
// })

// 出来的数据是引用 ref类型，如果在js中需要进行解引用
// 用于辅助 v-model进行数据解析
const value = defineModel<string>('value', { default: 'server' })
//  主要是父组件中的属性都能通过  defineModel进行定义
//  父组件中定义了属性，这里进行双向绑定，但是因为父组件不会接受这里的事件触发，因此这里实现的效果只是接受父组件的事件
const width = defineModel<number>('width', { default: 60 })

// 定义组件发出的事件
// const emit = defineEmits(['update:value'])
const iconSize = computed(() => Math.floor(width.value  * 0.4))

// 使用连接状态存储
const connectionStore = useConnectionStore()
const i18n = useI18n()

// 主菜单选项, 计算属性，必函数强的点是只有监听的变量改变时才会重新计算
const menuOptions = computed<MenuOption[]>(() => {
  return [
    {
      label: i18n.t('structure'), // 国际化显示文本，可通过i18n进行自动国际化处理
      key: 'structure',   // 菜单当行显示标识符
      icon: renderIcon(ToggleDb),
      show: connectionStore.anyConnectionOpened,
    },
    {
      label: i18n.t('server'),
      key: 'server',
      icon: renderIcon(ToggleServer),
    },
      {
        label: i18n.t('log'),
        key: 'log',
        icon: renderIcon(Log),
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
      label: i18n.t('help'),
      key: 'help',
      icon: renderIcon(Help),
    },
    {
      label: i18n.t('about'),
      key: 'about',
      icon: renderIcon(About),
    },
    {
      label: i18n.t('check_update'),
      key: 'update',
      icon: renderIcon(Update),
    },
  ]
})

// 渲染上下文标签, 函数组件，返回一个 VNode
const renderContextLabel = (option: DropdownOption) => {
  const label = typeof option.label === 'string' ? option.label : ''
  return h('div', { class: 'context-menu-item' }, label)
}

// 获取dialog 需要的存储 数据
const dialogStore = useDialogStore()
// 处理偏好设置菜单选择, 函数，根据选择的菜单项执行相应的操作
const onSelectPreferenceMenu = (key: MenuItemKey) => {
  switch (key) {
    case 'preferences':
      //  将偏好设置菜单打开，这里只是打开渲染的标志
      dialogStore.openPreferencesDialog()
      break
    case 'update':
      break
  }
}

// 打开 GitHub 页面
const openGithub = () => {
  //  wails 自带， 调用默认浏览器打开对应网址
  BrowserOpenURL('https://github.com/andrewbytecoder/wrdm')
}
</script>

<template>
  <div id="app-nav-menu"
       :style="{
          width: width + 'px',
       }"
       class="flex-box-v">
<!--   @update:value="(val:  string) => emit('update:value', val)" 更新父组件的 v-model:value值  -->
    <n-menu
        v-model:collapsed-width="width"
        v-model:value="value"
        :collapsed="true"
        :collapsed-icon-size="iconSize"
        :options="menuOptions"
    />
<!--  用来撑满中间空白区域-->
    <div class="flex-item-expand" ></div>
    <div class="nav-menu-item flex-box-v">
<!--      下拉框，点开是一个拉开的框框-->
<!--      会根据位置进行展开，如果在上面会向下展开，如果在下面会向上展开-->
      <n-dropdown
          :animated="true"
          :keyboard="false"
          :options="preferencesOptions"
          :render-label="renderContextLabel"
          trigger="click"
          @select="onSelectPreferenceMenu"
      >
        <icon-button :icon="Config" :size="iconSize" class="nav-menu-button" />
      </n-dropdown>
      <icon-button :icon="Github" :size="iconSize" class="nav-menu-button" @click="openGithub"/>
    </div>
  </div>
</template>

<style lang="scss">
#app-nav-menu {
  //width: 60px;
  //border-right: v-bind('themeVars.borderColor') solid 1px;

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
