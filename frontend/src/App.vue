<script setup lang="ts">
import ConnectionDialog from './components/dialogs/ConnectionDialog.vue'
import NewKeyDialog from './components/dialogs/NewKeyDialog.vue'
import PreferencesDialog from './components/dialogs/PreferencesDialog.vue'
import RenameKeyDialog from './components/dialogs/RenameKeyDialog.vue'
import SetTtlDialog from './components/dialogs/SetTtlDialog.vue'
import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import { NMessageProvider, NNotificationProvider, NDialogProvider } from 'naive-ui'
import plaintext from 'highlight.js/lib/languages/plaintext'
import AddFieldsDialog from './components/dialogs/AddFieldsDialog.vue'
import type { Ref } from 'vue'
import AppContent from "./AppContent.vue";
import 'highlight.js/styles/default.css'
import HelloWorld from './components/HelloWorld.vue'

interface Data {
  asideWith: number
  hoverResize: boolean
  resizing: boolean
}

interface Preferences {
  general?: {
    language?: string
    font_size?: number
  }
}

hljs.registerLanguage('json', json)
hljs.registerLanguage('plaintext', plaintext)

const themeOverrides = {
  common: {
    // primaryColor: '#409EFF',
    borderRadius: '4px',
    borderRadiusSmall: '3px',
    fontFamily: `"Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
  "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue"`,
    lineHeight: 1.5,
  },
  Tag: {
    // borderRadius: '3px'
  },
  Tabs: {
    tabGapSmallCard: '1px',
    tabGapMediumCard: '1px',
    tabGapLargeCard: '1px',
  }
}

</script>

<template>
  <!-- 1. 最外层：n-config-provider -->
  <n-config-provider :hljs="hljs" :inline-theme-disabled="true" :theme-overrides="themeOverrides" class="fill-height">

    <!-- 2. 第二层：n-message-provider (包裹所有需要使用 useMessage 的组件) -->
    <n-message-provider>

      <!-- 3. 第三层：n-dialog-provider -->
      <n-dialog-provider>

        <!-- 4. 你的应用主内容 -->
        <AppContent />

        <!-- 5. 所有全局的模态对话框 -->
        <ConnectionDialog />
        <NewKeyDialog />
        <AddFieldsDialog />
        <RenameKeyDialog />
        <SetTtlDialog />
        <PreferencesDialog />

      </n-dialog-provider>

    </n-message-provider>

  </n-config-provider>
</template>



<!--<template>-->
<!--  <n-config-provider>-->
<!--    <n-dialog-provider>-->
<!--      <n-notification-provider>-->
<!--        <n-message-provider>-->
<!--          &lt;!&ndash; 您的应用内容 &ndash;&gt;-->
<!--          <AppContent />-->

<!--          &lt;!&ndash; 5. 所有全局的模态对话框 &ndash;&gt;-->
<!--          <NewConnDialog />-->
<!--          <NewKeyDialog />-->
<!--          <AddFieldsDialog />-->
<!--          <RenameKeyDialog />-->
<!--          <SetTtlDialog />-->
<!--          <PreferencesDialog />-->
<!--        </n-message-provider>-->
<!--      </n-notification-provider>-->
<!--    </n-dialog-provider>-->
<!--  </n-config-provider>-->
<!--</template>-->

<style lang="scss"></style>
