<script setup lang="ts">
import { computed } from 'vue'
import { useThemeVars } from 'naive-ui'
import Refresh from '@/components/icons/Refresh.vue'
import IconButton from '@/components/common/IconButton.vue'

interface ServerStatusProps {
  server: string
  info: any
  autoRefresh: boolean
  loading: boolean
}

const props = withDefaults(defineProps<ServerStatusProps>(), {
  server: '',
  info: () => ({}),
  autoRefresh: false,
  loading: false,
})

const emit = defineEmits(['update:autoRefresh', 'refresh'])
const themeVars = useThemeVars()

const onUpdateAutoRefresh = (v: boolean) => {
  emit('update:autoRefresh', v)
}

const infoText = computed(() => {
  try {
    return JSON.stringify(props.info ?? {}, null, 2)
  } catch {
    return String(props.info ?? '')
  }
})
</script>

<template>
  <div class="server-status-wrapper flex-box-v">
    <div class="toolbar flex-box-h">
      <n-text depth="2">{{ server }}</n-text>
      <div class="flex-item-expand" />
      <n-space align="center" size="small">
        <n-switch
          :value="autoRefresh"
          @update:value="onUpdateAutoRefresh"
        />
        <icon-button :icon="Refresh" size="18" @click="emit('refresh')" />
      </n-space>
    </div>

    <n-spin :show="loading" class="flex-item-expand">
      <n-scrollbar class="flex-item-expand">
        <n-code :code="infoText" show-line-numbers word-wrap style="cursor: text" />
      </n-scrollbar>
    </n-spin>
  </div>
</template>

<style scoped lang="scss">
.server-status-wrapper {
  height: 100%;
  overflow: hidden;
  border-top: v-bind('themeVars.borderColor') 1px solid;
}

.toolbar {
  padding: 6px 0;
  align-items: center;
  border-bottom: v-bind('themeVars.borderColor') 1px solid;
}
</style>

