<script setup lang="ts">
import useDialog from '../../stores/dialog'
import Delete from '../icons/Delete.vue'
import Edit from '../icons/Edit.vue'
import Refresh from '../icons/Refresh.vue'
import Timer from '../icons/Timer.vue'
import RedisTypeTag from '../common/RedisTypeTag.vue'
import useConnectionStore from '../../stores/connections'
import { useI18n } from 'vue-i18n'
import { useMessage } from 'naive-ui'
import IconButton from '../common/IconButton.vue'
import { useConfirmDialog } from '../../utils/confirm_dialog'
import {ref} from 'vue'

interface Props {
  server: string
  db: number
  keyType: string
  keyPath: string
  ttl?: number
}

const props = withDefaults(defineProps<Props>(), {
  keyType: 'STRING',
  ttl: -1,
})

const border = ref<boolean>(true)

const dialogStore = useDialog()
const connectionStore = useConnectionStore()
const message = useMessage()
const i18n = useI18n()

const onReloadKey = () => {
  if (props.server && props.db !== undefined && props.keyPath) {
    connectionStore.loadKeyValue(props.server, props.db, props.keyPath)
  }
}

const confirmDialog = useConfirmDialog()
const onDeleteKey = () => {
  confirmDialog.warning(i18n.t('remove_tip', { name: props.keyPath }), () => {
    connectionStore.deleteKey(props.server, props.db, props.keyPath).then((success) => {
      if (success) {
        message.success(i18n.t('delete_key_succ', { key: props.keyPath }))
      }
    })
  })
}

const onConfirmDelete = async () => {
  if (props.server && props.db !== undefined && props.keyPath) {
    const success = await connectionStore.deleteKey(props.server, props.db, props.keyPath)
    if (success) {
      message.success(i18n.t('delete_key_succ', { key: props.keyPath }))
    }
  }
}
</script>


<!-- 右侧 Content 界面-->
<template>
  <div class="content-toolbar flex-box-h">
    <n-input-group>
      <RedisTypeTag :type="props.keyType" size="large"></RedisTypeTag>
      <n-input v-model:value="props.keyPath">
<!--        具名插槽，能放入到 n-input的后面-->
        <template #suffix>
<!--          带不带 : 只是是否动态绑定变量，对于后面的 probs 都能取到 -->
          <icon-button :icon="Refresh"  tTooltip="reload" size="18" @click="onReloadKey" />
        </template>
      </n-input>
    </n-input-group>
    <n-button-group>
      <n-tooltip>
        <template #trigger>
          <n-button @click="dialogStore.openTTLDialog(props.ttl)">
            <template #icon>
              <n-icon :component="Timer" size="18" />
            </template>
            <template v-if="ttl < 0">
              {{ $t('forever') }}
            </template>
            <template v-else> {{ ttl }} {{ $t('second') }}</template>
          </n-button>
        </template>
        TTL
            </n-tooltip>
            <icon-button
          :border=border
          :icon="Edit"
          t-tooltip="rename_key"
          size="18"
          @click="dialogStore.openRenameKeyDialog(props.server!, props.db!, props.keyPath!)"
      />
      <!--            <n-button @click="dialogStore.openRenameKeyDialog(props.server, props.db, props.keyPath)">-->
      <!--                <template #icon>-->
      <!--                    <n-icon :component="Edit" size="18" />-->
      <!--                </template>-->
      <!--                {{ $t('rename_key') }}-->
      <!--            </n-button>-->
    </n-button-group>
    <n-tooltip>
      <template #trigger>
        <n-button>
          <template #icon>
            <n-icon :component="Delete" size="18" @click="onDeleteKey" />
          </template>
        </n-button>
      </template>
      {{ $t('delete_key') }}
    </n-tooltip>
  </div>
</template>

<style lang="scss" scoped>
.content-toolbar {
  align-items: center;
  gap: 5px;
}
</style>
