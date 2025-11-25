<script setup lang="ts">
import useDialogStore from '../../stores/dialog'
import { NIcon } from 'naive-ui'
import AddGroup from '../icons/AddGroup.vue'
import AddLink from '../icons/AddLink.vue'
import Sort from '../icons/Sort.vue'
import ConnectionTree from './ConnectionTree.vue'
import IconButton from '../common/IconButton.vue'
import Filter from '../icons/Filter.vue'
import Unlink from '../icons/Unlink.vue'
import useConnectionStore from '../../stores/connections.js'


const dialogStore = useDialogStore()
const connectionStore = useConnectionStore()


const onSort = () => {
  dialogStore.openPreferencesDialog()
}

const onDisconnectAll = () => {
  connectionStore.closeAllConnection()
}

</script>

<template>
  <div  v-if="true" class="nav-pane-container flex-box-v">
    <ConnectionTree />

    <!-- bottom function bar -->
    <!--      @click 是注册 子组件点击事件相应情况 -->
    <!--      子组件后面跟的所有东西都是透传给子组件的参数-->
<!--    这里的 tTooltip 会自动转化为 i18n 依赖 IconButton 进行实现-->
    <div class="nav-pane-bottom flex-box-h">
      <IconButton
          :icon="AddLink"
          color="#555"
          size="20"
          stroke-width="4"
          tTooltip="new_conn"
          @click="dialogStore.openNewDialog()"
      />
      <IconButton
          :icon="AddGroup"
          color="#555"
          size="20"
          stroke-width="4"
          tTooltip="new_group"
          @click="dialogStore.openNewGroupDialog()"
      />
      <icon-button
          :disabled="!connectionStore.anyConnectionOpened"
          :icon="Unlink"
          color="#555"
          size="20"
          stroke-width="4"
          t-tooltip="disconnect_all"
          @click="onDisconnectAll"
      />
      <n-divider style="margin: 0 4px; --n-color: #aaa; width: 2px" vertical />
      <IconButton :icon="Sort" color="#555" size="20" stroke-width="4" t-tooltip="sort_conn" @click="onSort" />
      <n-input placeholder="">
        <template #prefix>
          <n-icon :component="Filter" color="#aaa" size="20" />
        </template>
      </n-input>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.nav-pane-container {
  overflow: hidden;
  background-color: var(--bg-color);

  .nav-pane-bottom {
    align-items: center;
    gap: 5px;
    padding: 3px 3px 5px 5px;
  }
}
</style>
