<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { get, isEmpty, map, toUpper } from 'lodash'
import useTabStore, {TabItem} from '@/stores/tab'
import useConnectionStore from '@/stores/connections'
import { useI18n } from 'vue-i18n'
import { useConfirmDialog } from '@/utils/confirm_dialog'
import ContentServerStatus from '@/components/content_value/ContentServerStatus.vue'
import EtcdKVView from '@/components/content_value/EtcdKVView.vue'

//  主内容界面

interface TabInfo {
  key: string
  label: string
}

const serverInfo = ref({})
const autoRefresh = ref(false)
const serverName = computed(():string => tabStore.currentTab?.server || tabStore.currentTab?.name || '')

const loadingServerInfo = ref<boolean>(false)
let refreshingServerInfo = false

/**
 * refresh server status info
 * @param {boolean} [force] force refresh will show loading indicator
 * @returns {Promise<void>}
 */
const refreshInfo = async (force: boolean): Promise<void> => {
  if (refreshingServerInfo) return
  refreshingServerInfo = true
  if (force) loadingServerInfo.value = true
  try {
    if (!isEmpty(serverName.value) && connectionStore.isConnected(serverName.value)) {
      serverInfo.value = connectionStore.status?.[serverName.value]?.status || {}
    }
  } catch (e: any) {
    console.warn('refresh server info failed', e)
  } finally {
    if (force) loadingServerInfo.value = false
    refreshingServerInfo = false
  }
}

let intervalId: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  refreshInfo(true)
  intervalId = setInterval(() => {
    if (autoRefresh.value) {
      refreshInfo(false)
    }
  }, 5000)
})

onUnmounted(() => {
  if (intervalId != null) {
    clearInterval(intervalId)
    intervalId = undefined
  }
})

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
        refreshInfo(true)
      }
    }
)

const tabContent = computed((): TabItem | null => tabStore.currentTab ?? null)

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
  const kv = await connectionStore.getKV(tab.server || tab.name, tab.key)
  tabStore.upsertTab({
    blank: false,
    name: tab.server || tab.name,
    server: tab.server || tab.name,
    db: 0,
    type: 'kv',
    ttl: -1,
    key: tab.key,
    value: kv,
  })
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
<!-- 显示服务状态-->
    <div v-if="showServerStatus" class="content-container flex-item-expand flex-box-v">
      <!-- select nothing or select server node, display server status -->
      <content-server-status
          v-model:auto-refresh="autoRefresh"
          :server="serverName"
          :info="serverInfo"
          :loading="loadingServerInfo"
          @refresh="refreshInfo(true)"
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
        :is="EtcdKVView"
        :server="tabContent?.server || tabContent?.name || ''"
        :key-path="tabContent?.key || ''"
        :kv="tabContent?.value"
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
