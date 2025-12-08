<script setup lang="ts">
import ContentPane from './components/content/ContentPane.vue'
import BrowserPane from './components/sidebar/BrowserPane.vue'
import { computed, nextTick, onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { get } from 'lodash'
import { useThemeVars } from 'naive-ui'
import NavMenu from './components/sidebar/NavMenu.vue'
import ConnectionPane from './components/sidebar/ConnectionPane.vue'
import ContentServerPane from './components/content/ContentServerPane.vue'
import useTabStore from './stores/tab.js'
import usePreferencesStore from './stores/preferences.js'

// 定义响应式数据类型
interface Data {
  navMenuWidth: number
  hoverResize: boolean
  resizing: boolean
}

const themeVars = useThemeVars()
// 界面大小是否可以拖动
const data: Data = reactive({
  navMenuWidth: 60,
  hoverResize: false,
  resizing: false,
})

const tabStore = useTabStore()

// 定义偏好设置类型
interface Preferences {
  general?: {
    language?: string
    font_size?: string
  }
  [key: string]: any
}

const prefStore = usePreferencesStore()
const i18n = useI18n()

onMounted(async () => {
    await prefStore.loadFontList()
    await prefStore.loadPreferences()
    await nextTick(() => {
        i18n.locale.value = get(prefStore.general, 'language', 'en')
    })
})

// TODO: apply font size to all elements
// const getFontSize = computed<string>(() => {
//   return get(preferences.value, 'general.font_size', 'en')
// })

const handleResize = (evt: MouseEvent) => {
  if (data.resizing) {
    tabStore.asideWidth = Math.max(evt.clientX - data.navMenuWidth, 300)
  }
}

const stopResize = () => {
  data.resizing = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  // TODO: Save sidebar x-position
}

const startResize = () => {
  data.resizing = true
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}

const asideWidthVal = computed<string>(() => {
  return tabStore.asideWidth + 'px'
})

//  计算属性，避免重复进行计算
const dragging = computed<boolean>(() => {
  return data.hoverResize || data.resizing
})
</script>

<template>
  <!-- app content-->
  <div id="app-container" :class="{ dragging }" class="flex-box-h" :style="prefStore.generalFont">

<!--    v-model定义的数据在子组件中能通过 @update:value事件触发值 更新-->
<!--    导航栏中选择具体的图标，然后更新 nav 根据nav然后触发下面显示面板显示不同的界面-->
    <NavMenu v-model:value="tabStore.nav" :width="data.navMenuWidth" />
<!--    <nav-menu  />-->
<!-- structure page-->
<!--    nav.menu中点击会修改 tabStore.nav 这里决定界面渲染什么 -->
    <div v-show="tabStore.nav === 'structure'" class="flex-box-h flex-item-expand">
      <div id="app-side" :style="{ width: asideWidthVal }" class="flex-box-h flex-item">
        <BrowserPane
            v-for="t in tabStore.tabs"
            v-show="get(tabStore.currentTab, 'name') === t.name"
            :key="t.name"
            class="flex-item-expand"
        />
        <div
            :class="{
                        'resize-divider-hover': data.hoverResize,
                        'resize-divider-drag': data.resizing,
                    }"
            class="resize-divider"
            @mousedown="startResize"
            @mouseout="data.hoverResize = false"
            @mouseover="data.hoverResize = true"
        />
      </div>
      <ContentPane class="flex-item-expand" />
    </div>

    <!-- server list page -->
    <div v-show="tabStore.nav === 'server'" class="flex-box-h flex-item-expand">
      <div id="app-side" :style="{ width: asideWidthVal }" class="flex-box-h flex-item">
        <ConnectionPane class="flex-item-expand" />
        <div
            :class="{
                        'resize-divider-hover': data.hoverResize,
                        'resize-divider-drag': data.resizing,
                    }"
            class="resize-divider"
            @mousedown="startResize"
            @mouseout="data.hoverResize = false"
            @mouseover="data.hoverResize = true"
        />
      </div>
      <ContentServerPane class="flex-item-expand" />
    </div>

    <!-- log page -->
    <div v-show="tabStore.nav === 'log'">display log</div>
  </div>
</template>

<style lang="scss">
#app-container {
    height: 100%;
    overflow: hidden;
    border-top: var(--border-color) 1px solid;
    box-sizing: border-box;

    #app-toolbar {
        height: 40px;
        border-bottom: var(--border-color) 1px solid;
    }

    #app-side {
        //overflow: hidden;
        height: 100%;

        .resize-divider {
            //height: 100%;
            width: 2px;
            border-left-width: 5px;
            background-color: var(--border-color);
        }

        .resize-divider-hover {
            width: 5px;
        }

        .resize-divider-drag {
            //background-color: rgb(0, 105, 218);
            width: 5px;
            //background-color: var(--el-color-primary);
            background-color: v-bind('themeVars.primaryColor');
        }
    }
}

.dragging {
    cursor: col-resize !important;
}
</style>