<script setup lang="ts">
import useDialogStore from '../../stores/dialog'
import { NIcon, useThemeVars } from 'naive-ui'
import AddGroup from '../icons/AddGroup.vue'
import AddLink from '../icons/AddLink.vue'
import ConnectionTree from './ConnectionTree.vue'
import IconButton from '../common/IconButton.vue'
import Filter from '../icons/Filter.vue'
import Unlink from '../icons/Unlink.vue'
import useConnectionStore from '../../stores/connections.js'
import { ref } from 'vue'
import { useI18n } from "vue-i18n";

const themeVars = useThemeVars()
const dialogStore = useDialogStore()
const connectionStore = useConnectionStore()

const filterPattern = ref('')

const onDisconnectAll = () => {
  connectionStore.closeAllConnection()
}

const t = useI18n().t

</script>

<template>
  <div  v-if="true" class="nav-pane-container flex-box-v">
<!--      上层的连接列表-->
    <ConnectionTree :filterPattern="filterPattern" />

    <!-- bottom function bar -->
    <!--      @click 是注册 子组件点击事件相应情况 -->
    <!--      子组件后面跟的所有东西都是透传给子组件的参数-->
<!--    这里的 tTooltip 会自动转化为 i18n 依赖 IconButton 进行实现-->
    <div class="nav-pane-bottom flex-box-h">
      <IconButton
          :icon="AddLink"
          size="20"
          stroke-width="4"
          tTooltip="new_conn"
          @click="dialogStore.openNewDialog()"
      />
      <IconButton
          :icon="AddGroup"
          size="20"
          stroke-width="4"
          tTooltip="new_group"
          @click="dialogStore.openNewGroupDialog()"
      />
      <icon-button
          :disabled="!connectionStore.anyConnectionOpened"
          :icon="Unlink"
          size="20"
          stroke-width="4"
          t-tooltip="disconnect_all"
          @click="onDisconnectAll"
      />
      <n-input v-model:value="filterPattern" :placeholder="$t('filter')" clearable>
        <template #prefix>
          <n-icon :component="Filter" size="20" />
        </template>
      </n-input>
    </div>
  </div>
</template>

<!--<style lang="scss" scoped>-->
<!--.nav-pane-container {-->
<!--  overflow: hidden;-->
<!--  background-color: var(&#45;&#45;bg-color);-->

<!--  .nav-pane-bottom {-->
<!--    align-items: center;-->
<!--    gap: 5px;-->
<!--    padding: 3px 3px 5px 5px;-->
<!--  }-->
<!--}-->
<!--</style>-->

<style scoped lang="scss">
.nav-pane-bottom {
  color: v-bind('themeVars.iconColor');
  border-top: v-bind('themeVars.borderColor') 1px solid;
}
</style>