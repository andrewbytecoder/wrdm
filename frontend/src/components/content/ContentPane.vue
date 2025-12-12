<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { types } from '../../consts/support_redis_type'
import ContentValueHash from '../content_value/ContentValueHash.vue'
import ContentValueList from '../content_value/ContentValueList.vue'
import ContentValueString from '../content_value/ContentValueString.vue'
import ContentValueSet from '../content_value/ContentValueSet.vue'
import ContentValueZset from '../content_value/ContentValueZSet.vue'
import { get, isEmpty, map, toUpper } from 'lodash'
import useTabStore, {TabItem} from '../../stores/tab'
import type { Component } from 'vue'
import { useDialog } from 'naive-ui'
import useConnectionStore from '../../stores/connections'
import { useI18n } from 'vue-i18n'
import { useConfirmDialog } from '../../utils/confirm_dialog.js'
import ContentServerStatus from '../content_value/ContentServerStatus.vue'

//  主内容界面

const serverInfo = ref({})
const autoRefresh = ref(false)
const serverName = computed(():string => {
  if (tabContent.value != null) {
    return tabContent.value.name
  }
  return ''
})
const refreshInfo = async () => {
  if (!isEmpty(serverName.value) && connectionStore.isConnected(serverName.value)) {
    serverInfo.value = await connectionStore.getServerInfo(serverName.value)
  }
}

let intervalId: number
onMounted(() => {
  refreshInfo()
  intervalId = setInterval(() => {
    if (autoRefresh.value) {
      refreshInfo()
    }
  }, 5000)
})

onUnmounted(() => {
  clearInterval(intervalId)
})

interface TabInfo {
  key: string
  label: string
}

const valueComponents: Record<string, Component> = {
  [types.STRING]: ContentValueString,
  [types.HASH]: ContentValueHash,
  [types.LIST]: ContentValueList,
  [types.SET]: ContentValueSet,
  [types.ZSET]: ContentValueZset,
}

const dialog = useDialog()
const connectionStore = useConnectionStore()
const tabStore = useTabStore()

//  将有多少个tabs转换成页面标签
const tab = computed((): TabInfo[] =>
    map(tabStore.tabs, (item) => ({
      key: item.name,
      label: item.title || '',
    }))
)

watch(
    () => tabStore.nav,
    (nav) => {
      if (nav === 'browser') {
        refreshInfo()
      }
    }
)

const tabContent = computed((): TabItem | null => {
  const tab = tabStore.currentTab
  if (tab == null) {
    return null
  }
  return {
    blank: false,
    server: "",
    name: tab.name,
    type: toUpper(tab.type || ''),
    db: tab.db,
    key: tab.key,
    ttl: tab.ttl,
    value: tab.value
  }
})

const showServerStatus = computed(() => {
  return tabContent.value == null || isEmpty(tabContent.value.key)
})

const showNonexists = computed(() => {
  return tabContent.value?.value == null
})

const onUpdateValue = (tabIndex: number) => {
  tabStore.switchTab(tabIndex)
}

// const onAddTab = () => {
//   tabStore.newBlankTab()
// }
/**
 * reload current selection key
 * @returns {Promise<null>}
 */
const onReloadKey = async () => {
  const tab = tabStore.currentTab
  if (tab == null || isEmpty(tab.key)) {
    return null
  }
  await connectionStore.loadKeyValue(tab.name, tab.db as number, tab.key)
}
const i18n = useI18n()
const confirmDialog = useConfirmDialog()
//  这里的参数由 value传入的类型是什么来决定
const onCloseTab = (tabIndex: number) => {
  confirmDialog.warning(i18n.t('close_confirm'), () => {
    const tab = get(tabStore.tabs, tabIndex)
    if (tab != null) {
      connectionStore.closeConnection(tab.name)
    }
  })


  tabStore.removeTab(tabIndex)
  console.log('TODO: close connection also')
}
</script>

<template>
  <div class="content-container flex-box-v">
<!--    value 传入的事啥，关闭的时候传入的参数也是啥-->
    <n-tabs
        v-model:value="tabStore.activatedIndex"
        :closable="true"
        size="small"
        type="card"
        :animated="true"
        @close="onCloseTab"
        @update:value="onUpdateValue"
    >
<!--      tab的具体内容-->
      <n-tab v-for="(t, i) in tab" :key="i" :name="i">
                <n-ellipsis style="max-width: 150px">{{ t.label }}</n-ellipsis>
      </n-tab>
    </n-tabs>
    <!-- TODO: add loading status -->

    <div v-if="showServerStatus" class="content-container flex-item-expand flex-box-v">
      <!-- select nothing or select server node, display server status -->
      <content-server-status
          v-model:auto-refresh="autoRefresh"
          :server="serverName"
          :info="serverInfo"
          @refresh="refreshInfo"
      />
    </div>
    <div v-else-if="showNonexists" class="content-container flex-item-expand flex-box-v">
      <n-empty :description="$t('nonexist_tab_content')" class="empty-content">
        <template #extra>
          <n-button @click="onReloadKey">{{ $t('reload') }}</n-button>
        </template>
      </n-empty>
    </div>
    <component
        v-else
        :is="valueComponents[tabContent?.type as string]"
        :db="tabContent?.db"
        :key-path="tabContent?.key"
        :key-type="tabContent?.type"
        :name="tabContent?.name"
        :ttl="tabContent?.ttl"
        :value="tabContent?.value"
    />
  </div>
</template>

<style lang="scss" scoped>
//@import "content";
@use "content";

.content-container {
  padding: 5px;
  box-sizing: border-box;
}

//.tab-item {
//    gap: 5px;
//    padding: 0 5px 0 10px;
//    align-items: center;
//    max-width: 150px;
//
//    transition: all var(--transition-duration-fast) var(--transition-function-ease-in-out-bezier);
//
//    &-label {
//        font-size: 15px;
//        text-align: center;
//    }
//
//    &-close {
//        &:hover {
//            background-color: rgb(176, 177, 182, 0.4);
//        }
//    }
//}
</style>
